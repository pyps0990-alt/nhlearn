import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDFFtn4Sn5l9LKBV4vpmDohknwr-C42TuY",
  authDomain: "gsat-pro.firebaseapp.com",
  projectId: "gsat-pro",
  storageBucket: "gsat-pro.firebasestorage.app",
  messagingSenderId: "288124052978",
  appId: "1:288124052978:web:37f00d24cfd0322d38376b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 根據實際店家資訊更新精確地址，確保 Google Maps 導航可以直接找到店家頁面
const stores = [
  {
    name: 'ONEGOOD烤肉飯 內湖店',
    discount: '現場：任意消費一份烤肉飯 該餐點享九折優惠 (每張學生證限優惠一碗)。店家外送：整筆消費九折 (需滿1000元，須從店家官方LINE訂購)',
    type: '餐飲',
    icon: '🍱',
    distance: '特約商店',
    address: '台北市內湖區民善街78號',
    operatingHours: '11:00 - 21:00',
    deliveryStatus: '有配合外送',
    estimatedTime: '依距離而定',
    deliveryUrl: ''
  },
  {
    name: '七號CHi HAO 西湖店',
    discount: '現場：任意消費一份鍋物/主食 該餐點享九折優惠 (每張學生證限優惠一碗，不包含其他品項)',
    type: '餐飲',
    icon: '🍲',
    distance: '特約商店',
    address: '台北市內湖區瑞光路258號',
    operatingHours: '11:30 - 20:30',
    deliveryStatus: '僅限自取',
    estimatedTime: '',
    deliveryUrl: ''
  },
  {
    name: '男子漢拉麵食堂 內湖737店',
    discount: '任意消費一份主食即贈送咖哩可樂餅乙份 (每張學生證限優惠一份)',
    type: '餐飲',
    icon: '🍜',
    distance: '特約商店',
    address: '台北市內湖區內湖路一段737號',
    operatingHours: '11:30 - 20:30',
    deliveryStatus: '僅限自取',
    estimatedTime: '',
    deliveryUrl: ''
  },
  {
    name: '柔屋冰品',
    discount: '任意消費一份甜品 該餐點免費加乙份料 (每張學生證限優惠一份)',
    type: '飲料',
    icon: '🍧',
    distance: '特約商店',
    address: '台北市內湖區文德路206號',
    operatingHours: '13:00 - 22:00',
    deliveryStatus: '僅限自取',
    estimatedTime: '',
    deliveryUrl: ''
  },
  {
    name: '文湖21雞湯麵',
    discount: '任意消費一碗雞湯麵 該餐點享九折優惠 (每張學生證限優惠一碗，不包含其他品項)',
    type: '餐飲',
    icon: '🍜',
    distance: '特約商店',
    address: '台北市內湖區文湖街21號',
    operatingHours: '10:30 - 19:30',
    deliveryStatus: '僅限自取',
    estimatedTime: '',
    deliveryUrl: ''
  },
  {
    name: '開軒製粥',
    discount: '現場：任意消費粥類一碗 該餐點享九折優惠。店家外送：整筆消費九折 (需現場電話訂購，15碗以上須提前一天訂購)',
    type: '餐飲',
    icon: '🥣',
    distance: '特約商店',
    address: '台北市內湖區內湖路一段120巷15號',
    operatingHours: '07:00 - 14:00',
    deliveryStatus: '有配合外送',
    estimatedTime: '提前訂購',
    deliveryUrl: ''
  },
  {
    name: '麵匡匡 內湖文德店',
    discount: '優惠A：整桌消費享九折優惠。優惠B：任意消費一碗拉麵即贈送40元小菜乙份或飲料乙瓶 (二選一，每張學生證贈送乙份)',
    type: '餐飲',
    icon: '🍜',
    distance: '特約商店',
    address: '台北市內湖區文德路12號',
    operatingHours: '11:30 - 21:00',
    deliveryStatus: '僅限自取',
    estimatedTime: '',
    deliveryUrl: ''
  },
  {
    name: '藍室',
    discount: '現場：任意消費飲料每杯享5元折扣。店家外送：整筆消費九折 (需使用電話備註訂購，需滿200元才可以外送)',
    type: '飲料',
    icon: '🥤',
    distance: '特約商店',
    address: '台北市內湖區民權東路六段180號',
    operatingHours: '10:00 - 22:00',
    deliveryStatus: '有配合外送',
    estimatedTime: '依訂單',
    deliveryUrl: ''
  },
  {
    name: '好YOUNG 港味燒臘',
    discount: '任意消費一份便當 該餐點享10元折扣 (每張學生證限優惠一份)',
    type: '餐飲',
    icon: '🍱',
    distance: '特約商店',
    address: '台北市內湖區瑞光路376號1樓',
    operatingHours: '10:30 - 20:00',
    deliveryStatus: '僅限自取',
    estimatedTime: '',
    deliveryUrl: ''
  },
  {
    name: '喜魚小酸菜魚 內湖店',
    discount: '任意消費一份主食即贈送豆花乙份 (每張學生證限優惠一份)',
    type: '餐飲',
    icon: '🍲',
    distance: '特約商店',
    address: '台北市內湖區瑞光路302號1樓',
    operatingHours: '11:00 - 21:00',
    deliveryStatus: '僅限自取',
    estimatedTime: '',
    deliveryUrl: ''
  }
];

async function seed() {
  // 先清除舊資料
  console.log("Clearing old store data...");
  const snapshot = await getDocs(collection(db, 'stores'));
  for (const document of snapshot.docs) {
    await deleteDoc(doc(db, 'stores', document.id));
    console.log(`Deleted: ${document.id}`);
  }
  console.log(`Cleared ${snapshot.size} old records.`);

  // 再寫入新資料
  console.log("Seeding updated store data with accurate addresses...");
  for (const store of stores) {
    try {
      await addDoc(collection(db, 'stores'), {
        ...store,
        createdAt: Date.now()
      });
      console.log(`✓ Added: ${store.name} (${store.address})`);
    } catch (e) {
      console.error(`✗ Failed to add ${store.name}: `, e);
    }
  }
  console.log("Seeding complete!");
  process.exit(0);
}

seed();
