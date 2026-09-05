// Importar Firebase desde CDN (para que funcione directo en el navegador)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Tu configuración exacta de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCtXfnyF_BAzuv8SGEiqh-36ad5jKWSWdg",
  authDomain: "pagina-de-bebidas.firebaseapp.com",
  projectId: "pagina-de-bebidas",
  storageBucket: "pagina-de-bebidas.firebasestorage.app",
  messagingSenderId: "132152121137",
  appId: "1:132152121137:web:a352d88b5c9fb4ef648210",
  measurementId: "G-M8ZL726TTB"
};

// Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Exportar para usar en los otros archivos
export { db, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, where };