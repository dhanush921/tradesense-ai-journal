import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyB7-29675xOwZV6Mc90Duzn-7Vsau2UwCQ",
  authDomain: "online-trading-joural.firebaseapp.com",
  projectId: "online-trading-joural",
  storageBucket: "online-trading-joural.firebasestorage.app",
  messagingSenderId: "981598107400",
  appId: "1:981598107400:web:0b5c429025528ce3701ebd",
  measurementId: "G-VCBEGHMJ2C"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = typeof window !== "undefined" ? getFirestore(app) : null as any;
const storage = typeof window !== "undefined" ? getStorage(app) : null as any;

let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export { app, auth, db, storage, analytics };
