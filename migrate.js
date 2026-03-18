import admin from "firebase-admin";
import { readFileSync } from "fs";

// 🔴 1. 載入金鑰
const serviceAccount = JSON.parse(
  readFileSync(new URL('./gsat-pro-firebase-adminsdk-fbsvc-20fbd19baa.json', import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 🔴 2. 設定基礎變數
const SCHOOL_ID = "nhsh"; 
const SCHOOL_NAME = "內湖高中";

// 🔴 3. 清理開關 (確認無誤後設為 true)
const DELETE_OLD_COLLECTIONS = true; 
const COLLECTIONS_TO_DELETE = ["classes", "feedback", "stores", "users", "vocab"]; 

async function runUltimateMigration() {
  console.log(`🌟 GSAT-pro [${SCHOOL_NAME}] 終極搬遷與大掃除啟動...`);

  try {
    let batch = db.batch(); 
    let batchCount = 0;

    // 安全的批次提交函式
    const commitBatchIfNeeded = async (force = false) => {
      if (batchCount >= 400 || (force && batchCount > 0)) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    };

    // ==========================================
    // 💬 1. 搬遷 feedback -> Feedback
    // ==========================================
    console.log("💬 正在搬遷 [feedback] 到 [Feedback]...");
    const oldFeedbackSnap = await db.collection("feedback").get();
    let feedbackCount = 0;
    for (const doc of oldFeedbackSnap.docs) {
      batch.set(db.collection("Feedback").doc(doc.id), doc.data(), { merge: true });
      batchCount++; feedbackCount++;
      await commitBatchIfNeeded();
    }
    console.log(`   ✅ 成功搬遷 ${feedbackCount} 筆回饋資料。`);

    // ==========================================
    // 👤 2. 搬遷 users -> Users (並補齊子集合)
    // ==========================================
    console.log("👤 正在搬遷 [users] 到 [Users] 並對齊格式...");
    const oldUsersSnap = await db.collection("users").get();
    let usersCount = 0;
    for (const doc of oldUsersSnap.docs) {
      const data = doc.data();
      const newRef = db.collection("Users").doc(doc.id);
      
      batch.set(newRef, {
        ...data,
        classId: data.classId || "206",
        fcmTokens: data.fcmTokens || ["default_token"]
      }, { merge: true });
      batchCount++;

      // 建立個人私有庫
      batch.set(newRef.collection("PersonalSchedule").doc("init_event"), { title: "晚上補習" });
      batch.set(newRef.collection("PersonalVocab").doc("init_word"), { word: "abandon" });
      batchCount += 2; usersCount++;
      await commitBatchIfNeeded();
    }
    console.log(`   ✅ 成功搬遷並對齊 ${usersCount} 位使用者資料。`);

    // ==========================================
    // 🏫 3. 建立學校結構 & 搬遷 stores -> SpecialData
    // ==========================================
    console.log("🏫 正在建立學校結構與搬遷 [stores]...");
    const schoolRef = db.collection("Schools").doc(SCHOOL_ID);
    batch.set(schoolRef, { name: SCHOOL_NAME, address: "台北市內湖區" }, { merge: true });
    batchCount++;

    const oldStoresSnap = await db.collection("stores").get();
    let storesCount = 0;
    for (const doc of oldStoresSnap.docs) {
      batch.set(schoolRef.collection("SpecialData").doc(doc.id), doc.data(), { merge: true });
      batchCount++; storesCount++;
      await commitBatchIfNeeded();
    }
    console.log(`   ✅ 成功搬遷 ${storesCount} 筆特殊資料 (stores)。`);

    // ==========================================
    // 📖 4. 建立【全校單字庫】(將 6000 words 放這裡)
    // ==========================================
    console.log("📖 正在將舊版 6000 單字庫設為【全校單字】...");
    const vocabWordsSnap = await db.collection("vocab").doc("6000 words").collection("words").get();
    let wordCount = 0;
    const schoolVocabRef = schoolRef.collection("SchoolVocab"); // 學校層級的單字庫

    for (const d of vocabWordsSnap.docs) {
      batch.set(schoolVocabRef.doc(d.id), { 
        ...d.data(), 
        source: "6000 words built-in" 
      }, { merge: true });
      batchCount++; wordCount++;
      await commitBatchIfNeeded();
    }
    console.log(`   📚 成功將 ${wordCount} 個單字配置到全校單字庫 (SchoolVocab)！`);

    // ==========================================
    // 🏢 5. 建立年級、班級，並建立【年級單字庫】
    // ==========================================
    const gradesConfig = [
      { id: "grade_1", prefix: "1", count: 18 },
      { id: "grade_2", prefix: "2", count: 18 },
      { id: "grade_3", prefix: "3", count: 18 }
    ];

    for (const grade of gradesConfig) {
      console.log(`   👉 正在生成 ${grade.id} 結構與年級專屬單字庫...`);
      const gradeRef = schoolRef.collection("Grades").doc(grade.id);

      // 建立該年級專屬的 GradeVocab
      const gradeVocabRef = gradeRef.collection("GradeVocab").doc(`init_${grade.id}_vocab`);
      batch.set(gradeVocabRef, { 
        word: "grade_specific_word", 
        level: `高${grade.prefix}專屬段考範圍` 
      }, { merge: true });
      batchCount++;

      // 生成該年級的 18 個班級
      for (let i = 1; i <= grade.count; i++) {
        const classNum = i < 10 ? `0${i}` : `${i}`; 
        const classId = `${grade.prefix}${classNum}`; 
        const classRef = gradeRef.collection("Classes").doc(classId);
        
        batch.set(classRef, { className: `${classId}班` }, { merge: true });
        batch.set(classRef.collection("ClassSchedule").doc("init_class"), { courseName: "班會", teacher: "導師" });
        batch.set(classRef.collection("Assignments").doc("init_hw"), { content: "系統測試作業", isNotified: false });
        batchCount += 3;
        await commitBatchIfNeeded();
      }
    }
    console.log("   ✅ 全校班級結構與【年級單字庫】配置完成！");

    // ==========================================
    // 🚚 6. 舊聯絡簿資料搬移 (classes/206 -> Assignments)
    // ==========================================
    const OLD_CLASS_ID = "206";
    console.log(`🚚 準備從 [classes/${OLD_CLASS_ID}] 搬移聯絡簿資料...`);
    const oldDocRef = db.doc(`classes/${OLD_CLASS_ID}`);
    const oldDoc = await oldDocRef.get();
    
    if (oldDoc.exists && oldDoc.data().contactBook) {
      const contactBookMap = oldDoc.data().contactBook;
      const targetClassRef = schoolRef.collection("Grades").doc("grade_2").collection("Classes").doc(OLD_CLASS_ID);
      let moveCount = 0;

      for (const [dateStr, items] of Object.entries(contactBookMap)) {
        if (Array.isArray(items)) {
          for (const item of items) {
            const newAssignRef = targetClassRef.collection("Assignments").doc();
            batch.set(newAssignRef, {
              ...item,              
              dueDateStr: dateStr,  
              dueDate: admin.firestore.Timestamp.fromDate(new Date(dateStr)),
              isNotified: false,    
              migratedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            batchCount++; moveCount++;
            await commitBatchIfNeeded();
          }
        }
      }
      console.log(`   ✅ 成功搬遷 ${moveCount} 筆舊聯絡簿作業！`);
    } else {
      console.log("   ℹ️ 無舊聯絡簿需要搬移。");
    }

    // 確保最後殘留的 batch 都推出去
    await commitBatchIfNeeded(true);

    // ==========================================
    // 🗑️ 7. 大掃除：刪除無用的舊集合
    // ==========================================
    if (DELETE_OLD_COLLECTIONS && COLLECTIONS_TO_DELETE.length > 0) {
      console.log("\n🗑️ 進入最終階段：清理無用的舊資料庫...");
      
      for (const collectionName of COLLECTIONS_TO_DELETE) {
        console.log(`   🔥 正在抹除 [${collectionName}] 及其所有內容...`);
        const collectionRef = db.collection(collectionName);
        await db.recursiveDelete(collectionRef);
        console.log(`   ✅ [${collectionName}] 已徹底刪除。`);
      }
      console.log("✨ 舊資料清理完畢！");
    }

    console.log("\n🎊 【GSAT-pro 單字分層優化與搬遷 100% 完美達成】");
    console.log("👉 全校單字 (SchoolVocab) 與年級單字 (GradeVocab) 皆已就緒！");

  } catch (err) {
    console.error("❌ 執行失敗：", err);
  } finally {
    process.exit(0);
  }
}

runUltimateMigration();