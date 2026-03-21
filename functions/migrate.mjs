import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";
import dotenv from "dotenv";

// 載入根目錄的 .env 檔案
dotenv.config({ path: './.env.local' });

const firebaseConfig = {
    apiKey: process.env.local_FIREBASE_API_KEY,
    authDomain: process.env.local_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const runMigration = async () => {
    const sourcePath = 'Schools/nhsh/SchoolVocab';
    const targetPath = 'Schools/taiwan/FreeVocab';

    console.log(`🚀 開始從 ${sourcePath} 搬遷至 ${targetPath}...`);

    try {
        const oldRef = collection(db, sourcePath);
        const snapshot = await getDocs(oldRef);

        if (snapshot.empty) {
            console.error('❌ 舊路徑找不到任何單字！請確認路徑是否正確。');
            process.exit(1);
        }

        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const chunks = [];
        for (let i = 0; i < docs.length; i += 400) {
            chunks.push(docs.slice(i, i + 400));
        }

        let totalCopied = 0;
        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(item => {
                const word = String(item.word || item.id || '').trim();
                if (!word) return;
                const newRef = doc(db, targetPath, word.toLowerCase());
                batch.set(newRef, { ...item, type: '內建', shared: true }, { merge: true });
            });
            await batch.commit();
            totalCopied += chunk.length;
            console.log(`⏳ 進度：已搬遷 ${totalCopied} / ${docs.length} 個單字...`);
        }

        console.log(`✅ 大功告成！成功複製了 ${totalCopied} 個單字到 ${targetPath}！`);
        process.exit(0); // 執行完畢自動關閉程序
    } catch (err) {
        console.error('❌ 搬遷發生錯誤:', err);
        process.exit(1);
    }
};

runMigration();