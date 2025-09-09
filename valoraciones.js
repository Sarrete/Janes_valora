// -------------------------
// VALORACIONES.JS COMPLETO
// Traducciones + Firebase
// -------------------------

// 1) IMPORTS FIREBASE
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, where, orderBy, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// 2) IMPORTS I18NEXT
import i18next from './libs/i18next.js';
import HttpBackend from './libs/i18next-http-backend.js';
import LanguageDetector from './libs/i18next-browser-languagedetector.js';

// 3) CONFIGURACIÓN FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCCOHmdAFNnENTFDuZIw4kb51NqfXA12DA",
  authDomain: "valoraciones-a8350.firebaseapp.com",
  projectId: "valoraciones-a8350",
  storageBucket: "valoraciones-a8350.appspot.com",
  messagingSenderId: "286602851936",
  appId: "1:286602851936:web:e1d4d11bfe1391dd1c7505"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 4) ELEMENTOS DOM
const form = document.getElementById('ratingForm');
const stars = document.querySelectorAll('#ratingStars .star');
const reviewsContainer = document.getElementById('reviews');
const verTodasBtn = document.getElementById('verTodasBtn');
let currentRating = 0;
let mostrandoTodas = false;
let todasLasReseñas = [];

// 5) INICIALIZAR i18next
i18next
  .use(HttpBackend)
  .use(LanguageDetector)
  .init({
    fallbackLng: 'es',
    backend: { loadPath: '/locales/{{lng}}.json' } // Ajusta según tu ruta
  })
  .then(() => {
    traducirValoraciones();
  });

// -------------------------
// FUNCIONES DE TRADUCCIÓN
// -------------------------
function traducirValoraciones() {
  // Placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = i18next.t(key);
  });

  // Labels y botones estáticos
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.innerText = i18next.t(key);
  });

  // Botón "Ver todas / Ver menos"
  if(verTodasBtn) {
    verTodasBtn.innerText = mostrandoTodas 
      ? i18next.t('reviews.viewAllLess')
      : i18next.t('reviews.viewAll');
  }

  // Botones "Ver más / Ver menos" dinámicos
  document.querySelectorAll('.ver-mas').forEach(btn => {
    btn.innerText = btn.dataset.estado === 'menos'
      ? i18next.t('reviews.viewLess')
      : i18next.t('reviews.viewMore');
  });
}

i18next.on('languageChanged', traducirValoraciones);

// -------------------------
// ESTRELLAS INTERACTIVAS
// -------------------------
function updateStars(rating) {
  stars.forEach((star, idx) => {
    star.classList.toggle('selected', idx < rating);
  });
}

stars.forEach((star, idx) => {
  const value = idx + 1;
  star.addEventListener('mouseover', () => updateStars(value));
  star.addEventListener('mouseout', () => updateStars(currentRating));
  star.addEventListener('click', () => {
    currentRating = value;
    updateStars(currentRating);
  });
});

// -------------------------
// ENVÍO FORMULARIO
// -------------------------
function contieneCodigoPeligroso(texto) {
  const patron = /<\s*script|onerror\s*=|onload\s*=|javascript:|<\s*iframe|<\s*img|<\s*svg/i;
  return patron.test(texto);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const comment = document.getElementById('comment').value.trim();
  const photoFile = document.getElementById('photo').files[0];

  if (!name) return alert(i18next.t('reviews.alertName') || 'Por favor, ingresa tu nombre.');
  if (currentRating === 0) return alert(i18next.t('reviews.alertRating') || 'Por favor, selecciona una valoración.');

  if (contieneCodigoPeligroso(name) || contieneCodigoPeligroso(comment)) {
    return alert(i18next.t('reviews.alertMalicious') || 'Tu valoración contiene código no permitido.');
  }

  try {
    let photoURL = null;

    if(photoFile) {
      const data = new FormData();
      data.append("file", photoFile);
      data.append("upload_preset", "valoraciones_janes");
      data.append("folder", "valoraciones");

      const res = await fetch("https://api.cloudinary.com/v1_1/dcsez2e0d/image/upload", {
        method: "POST",
        body: data
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Error subiendo imagen');
      photoURL = json.secure_url;
    }

    await addDoc(collection(db, 'valoraciones'), {
      nombre: name,
      comentario: comment || i18next.t('reviews.noComment') || 'Sin comentario',
      rating: currentRating,
      photoURL: photoURL || null,
      timestamp: serverTimestamp(),
      aprobado: false
    });

    alert(i18next.t('reviews.sent') || 'Valoración enviada. Se revisará antes de publicarse.');
    form.reset();
    currentRating = 0;
    updateStars(0);

  } catch(err) {
    console.error(err);
    alert(i18next.t('reviews.error') || 'Error al enviar la valoración.');
  }
});

// -------------------------
// ESCUCHA FIRESTORE
// -------------------------
const q = query(
  collection(db, 'valoraciones'),
  where('aprobado', '==', true),
  orderBy('timestamp', 'desc')
);

onSnapshot(q, snapshot => {
  const nuevas = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data?.nombre || typeof data.rating !== 'number') return;

    nuevas.push({
      nombre: data.nombre,
      comentario: data.comentario || i18next.t('reviews.noComment') || 'Sin comentario',
      rating: data.rating,
      photoURL: data.photoURL || null
    });
  });

  todasLasReseñas = nuevas;
  renderReviews();
});

// -------------------------
// RENDER RESEÑAS
// -------------------------
function renderReviews() {
  reviewsContainer.innerHTML = '';

  const lista = mostrandoTodas ? todasLasReseñas : todasLasReseñas.slice(0, 3);

  lista.forEach(r => {
    const div = document.createElement('div');
    div.classList.add('review-card');

    const comentarioSeguro = String(r.comentario);
    const textoCorto = comentarioSeguro.length > 120 ? comentarioSeguro.slice(0, 120) + "..." : comentarioSeguro;

    // Nombre
    const h3 = document.createElement('h3');
    h3.textContent = r.nombre;
    div.appendChild(h3);

    // Estrellas
    const starsP = document.createElement('p');
    starsP.classList.add('stars-display');
    starsP.textContent = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
    div.appendChild(starsP);

    // Comentario
    const p = document.createElement('p');
    p.classList.add('review-text');
    p.textContent = textoCorto;
    div.appendChild(p);

    // Botón "Ver más / Ver menos"
    if (comentarioSeguro.length > 120) {
      const btnVerMas = document.createElement('button');
      btnVerMas.classList.add('ver-mas');
      btnVerMas.dataset.estado = 'mas';
      btnVerMas.addEventListener('click', () => {
        if(p.innerText.endsWith('...')) {
          p.innerText = comentarioSeguro;
          btnVerMas.dataset.estado = 'menos';
        } else {
          p.innerText = textoCorto;
          btnVerMas.dataset.estado = 'mas';
        }
        traducirValoraciones();
      });
      div.appendChild(btnVerMas);
    }

    // Imagen
    if(r.photoURL) {
      const img = document.createElement('img');
      img.src = r.photoURL;
      img.alt = i18next.t('reviews.photo') || 'Foto valoración';
      img.loading = 'lazy';
      div.appendChild(img);
    }

    reviewsContainer.appendChild(div);
  });

  traducirValoraciones();
}

// -------------------------
// BOTÓN "VER TODAS / VER MENOS"
// -------------------------
if(verTodasBtn) {
  verTodasBtn.addEventListener('click', () => {
    mostrandoTodas = !mostrandoTodas;
    verTodasBtn.dataset.mostrando = mostrandoTodas;
    renderReviews();
  });
}
