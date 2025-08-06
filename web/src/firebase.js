import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// TODO: Replace with your actual Firebase config from the console
const firebaseConfig = {
  apiKey: "AIzaSyCsKFebvW1Xy7BV5XR37UCKEZID3LYzXsk",
  authDomain: "prepletix.firebaseapp.com",
  projectId: "prepletix",
  storageBucket: "prepletix.firebasestorage.app",
  messagingSenderId: "881317585520",
  appId: "1:881317585520:web:9034e8de4bcc9805a30ab5",
  measurementId: "G-X3VMVRRLVS",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

export const analytics = getAnalytics(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

export default app;
