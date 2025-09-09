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

// Mensaje inicial (fallback; se traducirá al cargar i18n)
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

// 7) I18N
let translations = {};

function traducirPlaceholders() {
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    const val = key.split('.').reduce((o, i) => o?.[i], translations);
    if (val) el.setAttribute("placeholder", val);
  });
}

function traducirBotonesDinamicos() {
  // Ver más / Ver menos en tarjetas
  document.querySelectorAll(".ver-mas").forEach(btn => {
    const more = translations?.reviews?.viewMore || "Ver más";
    const less = translations?.reviews?.viewLess || "Ver menos";
    btn.innerText = btn.dataset.state === "less" ? less : more;
  });

  // Botón global Ver todas / Ver menos
  if (verTodasBtn) {
    const mostrando = verTodasBtn.dataset.mostrando === "true";
    verTodasBtn.textContent = mostrando
      ? (translations?.reviews?.viewLess || "Ver menos")
      : (translations?.reviews?.viewAll || "Ver todas las valoraciones");
  }

  // Mensajes estáticos del contenedor (si existen)
  const loadingEl = reviewsContainer.querySelector(".loading");
  if (loadingEl) loadingEl.textContent = translations?.reviews?.loading || "Cargando valoraciones...";
  const noDataEl = reviewsContainer.querySelector(".no-data");
  if (noDataEl) noDataEl.textContent = translations?.reviews?.noData || "No hay valoraciones aprobadas todavía.";
}

async function cargarTraducciones(lang = "es") {
  try {
    const res = await fetch(`/locales/${lang}.json`);
    translations = await res.json();

    // Textos con data-i18n
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      const val = key.split('.').reduce((o, i) => o?.[i], translations);
      if (val) el.textContent = val;
    });

    // Placeholders
    traducirPlaceholders();

    // Botones y estados dinámicos
    traducirBotonesDinamicos();

  } catch (err) {
    console.error("Error cargando traducciones:", err);
  }
}

// Detectar idioma del navegador
function detectarIdiomaNavegador() {
  const idioma = navigator.language || navigator.userLanguage;
  return (idioma || "es").split('-')[0];
}

// Ejecutar traducciones al cargar
document.addEventListener("DOMContentLoaded", async () => {
  const lang = detectarIdiomaNavegador();
  await cargarTraducciones(lang);
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
      comentario: comment || (translations?.reviews?.noComment || 'Sin comentario'),
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
    alert(translations?.reviews?.alertError || ('Error al enviar la valoración: ' + (err?.message || err)));
  }
});

// 9) ESCUCHA EN TIEMPO REAL
const q = query(
  collection(db, 'valoraciones'),
  where('aprobado', '==', true),
  orderBy('timestamp', 'desc')
);

let todasLasReseñas = [];
let mostrandoTodas = false;

onSnapshot(q, (snapshot) => {
  const nuevas = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data?.nombre || typeof data.rating !== 'number') return;
    nuevas.push({
      nombre: data.nombre,
      comentario: data.comentario || (translations?.reviews?.noComment || 'Sin comentario'),
      rating: data.rating,
      photoURL: data.photoURL || null
    });
  });

  todasLasReseñas = nuevas;
  if (todasLasReseñas.length > 0) renderReviews();
  else {
    reviewsContainer.innerHTML = `<p class="no-data">${translations?.reviews?.noData || "No hay valoraciones aprobadas todavía."}</p>`;
  }
});

// 10) RENDER DE RESEÑAS
function renderReviews() {
  reviewsContainer.innerHTML = "";
  const lista = mostrandoTodas ? todasLasReseñas : todasLasReseñas.slice(0, 3);

  lista.forEach(r => {
    const div = document.createElement("div");
    div.classList.add("review-card");

    const comentarioSeguro = String(r.comentario || (translations?.reviews?.noComment || 'Sin comentario'));
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
      btnVerMas.dataset.state = "more";
      btnVerMas.innerText = translations?.reviews?.viewMore || "Ver más";

      btnVerMas.addEventListener("click", () => {
        if (btnVerMas.dataset.state === "more") {
          p.innerText = comentarioSeguro;
          btnVerMas.dataset.state = "less";
          btnVerMas.innerText = translations?.reviews?.viewLess || "Ver menos";
        } else {
          p.innerText = textoCorto;
          btnVerMas.dataset.state = "more";
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

  // Actualiza textos dinámicos tras render
  traducirBotonesDinamicos();
}

// 11) BOTÓN "VER TODAS"
if (verTodasBtn) {
  verTodasBtn.addEventListener("click", () => {
    mostrandoTodas = !mostrandoTodas;
    verTodasBtn.dataset.mostrando = mostrandoTodas ? "true" : "false";
    renderReviews();
  });

  // Estado inicial del botón (por si se pinta antes de traducciones)
  verTodasBtn.dataset.mostrando = "false";
  verTodasBtn.textContent = translations?.reviews?.viewAll || "Ver todas las valoraciones";
}
