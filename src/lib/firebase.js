import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// --- LÜTFEN KENDİ API BİLGİLERİNİZİ BURAYA GİRİN ---
const firebaseConfig = {
  apiKey: "AIzaSyB5Rpch7LJT01-r3WskxUl2RnLQCT39Z6A", // <-- Kendi Key'ini buraya yapıştır
  authDomain: "planprogram-21867.firebaseapp.com",
  projectId: "planprogram-21867",
  storageBucket: "planprogram-21867.firebasestorage.app",
  messagingSenderId: "925605872592",
  appId: "1:925605872592:web:2efeeafaa7aa623a2cafd5"
};

let app, auth, db, storage;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log("✅ Firebase Başlatıldı");
} catch (e) {
  console.error("❌ Firebase Başlatılamadı:", e);
}

export { auth, db, storage };
