
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

// IMPORTANT: This is a dummy configuration to allow the application to initialize
// without crashing. For the app to function correctly and connect to your database,
// you MUST replace these values with the actual configuration from your Firebase project.
// You can find this in: Project Settings > General > Your apps > Firebase SDK snippet (Config).

const firebaseConfig = {
  apiKey: "AIzaSyDt3C-9X0WKI4iUIJ8sXLCr6fdflmJcYPM",
  authDomain: "raphamed-f97d4.firebaseapp.com",
  projectId: "raphamed-f97d4",
  storageBucket: "raphamed-f97d4.firebasestorage.app",
  messagingSenderId: "261665309064",
  appId: "1:261665309064:web:0dec76c91839ac52647a3d"
};
// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();

// Configure Offline Persistence (IndexedDB)
// Using modern cache settings to avoid deprecation warnings for enableMultiTabIndexedDbPersistence
try {
  db.settings({
    localCache: firebase.firestore.persistentLocalCache({
      tabManager: firebase.firestore.persistentMultipleTabManager()
    })
  });
} catch (err: any) {
  if (err.code === 'failed-precondition') {
      console.warn('Persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
      console.warn('Persistence not supported by browser');
  } else {
      console.warn('Error enabling persistence:', err);
  }
}
