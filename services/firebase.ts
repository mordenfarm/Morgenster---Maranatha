
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

// IMPORTANT: This is a dummy configuration to allow the application to initialize
// without crashing. For the app to function correctly and connect to your database,
// you MUST replace these values with the actual configuration from your Firebase project.
// You can find this in: Project Settings > General > Your apps > Firebase SDK snippet (Config).


const firebaseConfig = {
  apiKey: "AIzaSyAptCds-zF3b5i8tTpnJIW16jilX6WZxlM",
  authDomain: "mh-maranatha.firebaseapp.com",
  projectId: "mh-maranatha",
  storageBucket: "mh-maranatha.firebasestorage.app",
  messagingSenderId: "976499019378",
  appId: "1:976499019378:web:bd8e359620abf1f9b6bceb"
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
