"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export function firebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps()[0] ?? initializeApp(config);
  }
  return app;
}

export function firebaseAuth(): Auth {
  if (!auth) auth = getAuth(firebaseApp());
  return auth;
}

export function firestore(): Firestore {
  if (!db) db = getFirestore(firebaseApp());
  return db;
}

export function firebaseStorage(): FirebaseStorage {
  if (!storage) storage = getStorage(firebaseApp());
  return storage;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId);
}
