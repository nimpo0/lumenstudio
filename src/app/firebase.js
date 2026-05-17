import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

function getFirebaseApp() {
  if (getApps().length) return getApps()[0];

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("Firebase API key не налаштовано");

  return initializeApp({
    apiKey,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  });
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}
