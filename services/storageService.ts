
import { initializeApp, getApp, getApps } from "firebase/app";
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
    // Gunakan app yang sudah ada jika tersedia untuk mencegah re-inisialisasi
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    if (app) {
      try {
        db = getFirestore(app);
        isCloudEnabled = true;
        console.log("SMADA Cloud: Firestore terhubung.");
      } catch (firestoreError) {
        console.warn("SMADA Warning: Gagal memuat layanan Firestore. Berjalan dalam mode Local.", firestoreError);
        isCloudEnabled = false;
      }
    }
  } else {
    console.warn("SMADA Mode: Berjalan dalam mode Local Storage (Offline).");
  }
} catch (error) {
  console.error("SMADA Critical: Gagal inisialisasi Firebase Core.", error);
  isCloudEnabled = false;
}

const getDocRef = () => (isCloudEnabled && db) ? doc(db, "system", "cloud_data") : null;

// Helper untuk timeout promise
const withTimeout = (promise: Promise<any>, ms: number) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))
  ]);
};

export const cloudStorage = {
  isCloudActive() {
    return isCloudEnabled;
  },

  async saveData(key: string, data: any) {
    localStorage.setItem(`cloud_${key}`, JSON.stringify(data));

    const docRef = getDocRef();
    if (isCloudEnabled && docRef) {
      try {
        await setDoc(docRef, { [key]: data }, { merge: true });
        return { success: true, mode: 'cloud' };
      } catch (error: any) {
        console.error(`Sinkronisasi Cloud Gagal (${key}):`, error);
        return { success: false, mode: 'local' };
      }
    }
    return { success: true, mode: 'local' };
  },

  async getAllData() {
    const localData = {
      exams: JSON.parse(localStorage.getItem('cloud_exams') || '[]'),
      results: JSON.parse(localStorage.getItem('cloud_results') || '[]'),
      students: JSON.parse(localStorage.getItem('cloud_students') || '[]'),
      submissions: JSON.parse(localStorage.getItem('cloud_submissions') || '[]')
    };

    const docRef = getDocRef();
    if (isCloudEnabled && docRef) {
      try {
        // Tambahkan timeout 5 detik agar tidak stuck selamanya
        const snap = await withTimeout(getDoc(docRef), 5000) as any;
        if (snap.exists()) {
          const cloudData = snap.data();
          return {
            exams: cloudData.exams || localData.exams,
            results: cloudData.results || localData.results,
            students: cloudData.students || localData.students,
            submissions: cloudData.submissions || localData.submissions
          };
        }
      } catch (error) {
        console.warn("Koneksi Cloud lambat atau Timeout. Menggunakan data lokal.");
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
