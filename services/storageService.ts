
import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

// Konfigurasi Firebase SMADA
const firebaseConfig = {
  apiKey: "AIzaSyBoK-vQnEZ4nx-qtOPoQoz4U717ms2wspU",
  authDomain: "smada-genius-2b055.firebaseapp.com",
  projectId: "smada-genius-2b055",
  storageBucket: "smada-genius-2b055.firebasestorage.app",
  messagingSenderId: "896106271626",
  appId: "1:896106271626:web:253832a86be0f54511ee73",
  measurementId: "G-TTZEC2TWZV"
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let isCloudEnabled = false;

// Inisialisasi Firebase dengan proteksi bertingkat
try {
  if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("PLACEHOLDER")) {
    app = initializeApp(firebaseConfig);
    if (app) {
      db = getFirestore(app);
      isCloudEnabled = true;
      console.log("SMADA Cloud: Firestore terhubung dengan sukses.");
    }
  } else {
    console.warn("SMADA Mode: Berjalan dalam mode Local Storage (Offline).");
  }
} catch (error) {
  console.error("SMADA Critical: Gagal inisialisasi Firebase.", error);
  isCloudEnabled = false;
}

// Helper untuk referensi dokumen pusat
const getDocRef = () => (isCloudEnabled && db) ? doc(db, "system", "cloud_data") : null;

export const cloudStorage = {
  isCloudActive() {
    return isCloudEnabled;
  },

  async saveData(key: string, data: any) {
    // Selalu simpan ke localStorage (Offline-First) sebagai backup utama
    localStorage.setItem(`cloud_${key}`, JSON.stringify(data));

    const docRef = getDocRef();
    if (isCloudEnabled && docRef) {
      try {
        await setDoc(docRef, { [key]: data }, { merge: true });
        return { success: true, mode: 'cloud' };
      } catch (error: any) {
        console.error(`Sinkronisasi Cloud Gagal (${key}):`, error);
        // Jika service terhenti di tengah jalan, nonaktifkan flag cloud sementara
        if (error.message && error.message.includes("available")) {
          isCloudEnabled = false;
        }
        return { success: false, mode: 'local' };
      }
    }
    return { success: true, mode: 'local' };
  },

  async getAllData() {
    // Muat data lokal terlebih dahulu untuk akses instan
    const localData = {
      exams: JSON.parse(localStorage.getItem('cloud_exams') || '[]'),
      results: JSON.parse(localStorage.getItem('cloud_results') || '[]'),
      students: JSON.parse(localStorage.getItem('cloud_students') || '[]'),
      submissions: JSON.parse(localStorage.getItem('cloud_submissions') || '[]')
    };

    const docRef = getDocRef();
    if (isCloudEnabled && docRef) {
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const cloudData = snap.data();
          // Merge data Cloud ke Lokal
          return {
            exams: cloudData.exams || localData.exams,
            results: cloudData.results || localData.results,
            students: cloudData.students || localData.students,
            submissions: cloudData.submissions || localData.submissions
          };
        }
      } catch (error) {
        console.warn("Gagal memuat data Cloud, menggunakan cache lokal.");
      }
    }
    return localData;
  },

  subscribeToData(callback: (data: any) => void) {
    const docRef = getDocRef();
    if (isCloudEnabled && docRef) {
      try {
        return onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            callback(snap.data());
          }
        }, (error) => {
          console.error("Firestore Sync Error:", error);
        });
      } catch (e) {
        console.error("Gagal memasang listener Firestore:", e);
      }
    }
    return () => {}; 
  }
};
