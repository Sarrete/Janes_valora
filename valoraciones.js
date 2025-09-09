// 1) IMPORTS FIREBASE
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, where, orderBy, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// 2) CONFIGURACIÓN FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCCOHmdAFNnENTFDuZIw4kb51NqfXA12DA",
  authDomain: "valoraciones-a8350.firebaseapp.com",
  projectId: "valoraciones-a8350",
  storageBucket: "valoraciones-a8350.appspot.com",
  messagingSenderId: "286602851936",
  appId: "1:286602851936:web:e1d4d11bfe1391dd1c7505"
};

// 3) INICIALIZAR APP Y SERVICIOS
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 4) ELEMENTOS DOM
const form = document.getElementById('ratingForm');
const stars = document.querySelectorAll('#ratingStars .star');
const reviewsContainer = document.getElementById('reviews');
const verTodasBtn = document.getElementById('verTodasBtn');
let currentRating = 0;

// Mensaje inicial
reviewsContainer.innerHTML = '<p class="loading">Cargando valoraciones...</p>';

// 5) ESTRELLAS INTERACTIVAS
function updateStars(rating) {
  stars.forEach((star, idx) => star.classList.toggle('selected', idx < rating));
}
stars.forEach((star, idx) => {
  const value = idx + 1;
  star.addEventListener('mouseover', () => updateStars(value));
  star.addEventListener('mouseout', () => updateStars(currentRating));
  star.addEventListener('click', () => { currentRating = value; updateStars(currentRating); });
});

// 6) FUNCIONES DE SEGURIDAD
function contieneCodigoPeligroso(texto) {
  const patron = /<\s*script|onerror\s*=|onload\s*=|javascript:|<\s*iframe|<\s*img|<\s*svg/i;
  return patron.test(texto);
}

// 7) FUNCIONES DE TRADUCCIÓN
let translations = {}; // Se llena al cargar el JSON

async function cargarTraducciones(lang = "es") {
  try {
    const res = await fetch(`../locales/${lang}.json`);
    translations = await res.json();

    // Placeholders
    const nameInput = document.getElementById("name");
    const commentInput = document.getElementById("comment");
    const submitBtn = document.querySelector("#ratingForm button[type='submit']");
    if (nameInput) nameInput.placeholder = translations.reviews?.placeholderName || nameInput.placeholder;
    if (commentInput) commentInput.placeholder = translations.reviews?.placeholderComment || commentInput.placeholder;
    if (submitBtn) submitBtn.textContent = translations.reviews?.submit || submitBtn.textContent;

    // Botón "Ver todas"
    if (verTodasBtn) verTodasBtn.textContent = translations.reviews?.viewAll || verTodasBtn.textContent;

  } catch (err) {
    console.error("Error cargando traducciones:", err);
  }
}

// Traduce botones dinámicos "Ver más / Ver menos"
function traducirBotonesDinamicos() {
  document.querySelectorAll(".ver-mas").forEach(btn => {
    if (btn.innerText.includes("...") || btn.innerText === "Ver más") {
      btn.innerText = translations?.reviews?.viewMore || btn.innerText;
    } else if (btn.innerText === "Ver menos") {
      btn.innerText = translations?.reviews?.viewLess || btn.innerText;
    }
  });

  if (verTodasBtn) {
    const mostrandoTodas = verTodasBtn.dataset.mostrando === "true";
    verTodasBtn.textContent = mostrandoTodas
      ? translations?.reviews?.viewLess + " valoraciones" || verTodasBtn.textContent
      : translations?.reviews?.viewAll || verTodasBtn.textContent;
  }
}

// Detectar idioma del navegador
function detectarIdiomaNavegador() {
  const idioma = navigator.language || navigator.userLanguage;
  return idioma.split('-')[0];
}

// Ejecutar traducciones al cargar
document.addEventListener("DOMContentLoaded", () => {
  const lang = detectarIdiomaNavegador();
  cargarTraducciones(lang);
});

// 8) ENVÍO FORMULARIO
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const comment = document.getElementById('comment').value.trim();
  const photoFile = document.getElementById('photo').files[0];

  if (!name) return alert(translations?.reviews?.alertName || 'Por favor, ingresa tu nombre.');
  if (currentRating === 0) return alert(translations?.reviews?.alertRating || 'Por favor, selecciona una valoración.');
  if (contieneCodigoPeligroso(name) || contieneCodigoPeligroso(comment)) {
    return alert(translations?.reviews?.alertMalicious || 'Tu valoración contiene código o caracteres no permitidos.');
  }

  try {
    let photoURL = null;
    if (photoFile) {
      const data = new FormData();
      data.append("file", photoFile);
      data.append("upload_preset", "valoraciones_janes");
      data.append("folder", "valoraciones");
      const res = await fetch("https://api.cloudinary.com/v1_1/dcsez2e0d/image/upload", { method: "POST", body: data });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Error subiendo imagen');
      photoURL = json.secure_url;
    }

    await addDoc(collection(db, 'valoraciones'), {
      nombre: name,
      comentario: comment || 'Sin comentario',
      rating: currentRating,
      photoURL: photoURL || null,
      timestamp: serverTimestamp(),
      aprobado: false
    });

    alert(translations?.reviews?.alertSent || 'Valoración enviada. Se revisará antes de publicarse.');
    form.reset();
    currentRating = 0;
    updateStars(0);

  } catch (err) {
    console.error(err);
    alert(translations?.reviews?.alertError || 'Error al enviar la valoración: ' + (err?.message || err));
  }
});

// 9) ESCUCHA EN TIEMPO REAL
const q = query(collection(db, 'valoraciones'), where('aprobado', '==', true), orderBy('timestamp', 'desc'));
let todasLasReseñas = [];
let mostrandoTodas = false;

onSnapshot(q, (snapshot) => {
  const nuevas = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data?.nombre || typeof data.rating !== 'number') return;
    nuevas.push({
      nombre: data.nombre,
      comentario: data.comentario || 'Sin comentario',
      rating: data.rating,
      photoURL: data.photoURL || null
    });
  });
  todasLasReseñas = nuevas;
  if (todasLasReseñas.length > 0) renderReviews();
  else reviewsContainer.innerHTML = '<p class="no-data">No hay valoraciones aprobadas todavía.</p>';
});

// 10) RENDER DE RESEÑAS
function renderReviews() {
  reviewsContainer.innerHTML = "";
  const lista = mostrandoTodas ? todasLasReseñas : todasLasReseñas.slice(0, 3);

  lista.forEach(r => {
    const div = document.createElement("div");
    div.classList.add("review-card");

    const comentarioSeguro = String(r.comentario || 'Sin comentario');
    const textoCorto = comentarioSeguro.length > 120 ? comentarioSeguro.slice(0, 120) + "..." : comentarioSeguro;

    // Nombre
    const h3 = document.createElement("h3");
    h3.textContent = r.nombre;
    div.appendChild(h3);

    // Estrellas
    const starsP = document.createElement("p");
    starsP.classList.add("stars-display");
    starsP.textContent = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
    div.appendChild(starsP);

    // Comentario
    const p = document.createElement("p");
    p.classList.add("review-text");
    p.textContent = textoCorto;
    div.appendChild(p);

    // Botón "Ver más / Ver menos"
    if (comentarioSeguro.length > 120) {
      const btnVerMas = document.createElement("button");
      btnVerMas.classList.add("ver-mas");
      btnVerMas.innerText = translations?.reviews?.viewMore || "Ver más";

      btnVerMas.addEventListener("click", () => {
        if (p.innerText.endsWith("...")) {
          p.innerText = comentarioSeguro;
          btnVerMas.innerText = translations?.reviews?.viewLess || "Ver menos";
        } else {
          p.innerText = textoCorto;
          btnVerMas.innerText = translations?.reviews?.viewMore || "Ver más";
        }
      });

      div.appendChild(btnVerMas);
    }

    // Imagen
    if (r.photoURL) {
      const img = document.createElement("img");
      img.src = r.photoURL;
      img.alt = translations?.reviews?.photoAlt || "Foto valoración";
      img.loading = "lazy";
      div.appendChild(img);
    }

    reviewsContainer.appendChild(div);
  });

  // Traducir botones dinámicos cada render
  traducirBotonesDinamicos();
}

// 11) BOTÓN "VER TODAS"
if (verTodasBtn) {
  verTodasBtn.addEventListener("click", () => {
    mostrandoTodas = !mostrandoTodas;
    verTodasBtn.dataset.mostrando = mostrandoTodas ? "true" : "false";
    renderReviews();
  });
}
