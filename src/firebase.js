// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB98ftiApQlwjWRD_5keM7D-BK2YQRjdl8",
  authDomain: "asadapp-28206.firebaseapp.com",
  projectId: "asadapp-28206",
  storageBucket: "asadapp-28206.firebasestorage.app",
  messagingSenderId: "152769545003",
  appId: "1:152769545003:web:50d639ec461131d0517b6e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
