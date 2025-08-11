// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC8jAvmwun7SYqzyBlXWL6enxXToTfTl3U",
  authDomain: "countrystatecity-aebd6.firebaseapp.com",
  projectId: "countrystatecity-aebd6",
  storageBucket: "countrystatecity-aebd6.firebasestorage.app",
  messagingSenderId: "464915491633",
  appId: "1:464915491633:web:83f3dc8ce6b366827c9e10",
  measurementId: "G-7YNFZ6X18Y"
};

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Analytics only in browser environment
let analytics: Analytics | undefined;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { app, analytics };