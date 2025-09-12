// IMPORTS FIREBASE
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// CONFIGURACIÓN FIREBASE (pública, no es secreta)
const firebaseConfig = {
  apiKey: "AIzaSyCCOHmdAFNnENTFDuZIw4kb51NqfXA12DA",
  authDomain: "valoraciones-a8350.firebaseapp.com",
  projectId: "valoraciones-a8350",
  storageBucket: "valoraciones-a8350.appspot.com",
  messagingSenderId: "286602851936",
  appId: "1:286602851936:web:e1d4d11bfe1391dd1c7505"
};

// INICIALIZAR APP Y SERVICIOS
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ELEMENTOS DOM
const form = document.getElementById('ratingForm');
const stars = document.querySelectorAll('#ratingStars .star');
const reviewsContainer = document.getElementById('reviews');
const verTodasBtn = document.getElementById('verTodasBtn');

let currentRating = 0;
let isSubmitting = false;

// MENSAJE INICIAL
reviewsContainer.innerHTML = '<p class="loading">Cargando valoraciones...</p>';

// ESTRELLAS INTERACTIVAS
function updateStars(rating) {
  stars.forEach((star, idx) => star.classList.toggle('selected', idx < rating));
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

// 🔹 Sanitizador usando DOMPurify
const sanitizeInput = (input) => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
};

// Helper para convertir archivo a base64
const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = (error) => reject(error);
});

// ENVÍO FORMULARIO
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isSubmitting) return;
  isSubmitting = true;

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';

  try {
    let name = sanitizeInput(document.getElementById('name').value);
    let comment = sanitizeInput(document.getElementById('comment').value);
    const photoFile = document.getElementById('photo').files[0];

    // 🚨 Nueva validación: avisar si DOMPurify deja vacío
    if (!name) {
      alert('Tu nombre está vacío o contiene contenido no permitido. Por favor, revisa e inténtalo de nuevo.');
      throw new Error();
    }
    if (!comment) {
      alert('Tu comentario está vacío o contiene contenido no permitido. Por favor, revisa e inténtalo de nuevo.');
      throw new Error();
    }
    if (currentRating === 0) throw new Error('Por favor, selecciona una valoración.');

    // Validación de imagen en cliente
    const MAX_BYTES = 5 * 1024 * 1024; // 5MB
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (photoFile) {
      if (!ALLOWED.includes(photoFile.type)) {
        throw new Error('Formato no permitido. Usa JPG, PNG o WEBP.');
      }
      if (photoFile.size > MAX_BYTES) {
        throw new Error('La imagen es demasiado grande (máx 5MB).');
      }
    }

    let photoURL = null;
    if (photoFile) {
      const base64File = await toBase64(photoFile);
      const res = await fetch('/.netlify/functions/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: base64File })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `Error subiendo imagen (HTTP ${res.status})`);
      }
      photoURL = json.secure_url;
    }

    // Guardar en Firestore
    await addDoc(collection(db, 'valoraciones'), {
      nombre: name,
      comentario: comment,
      rating: currentRating,
      photoURL: photoURL || null,
      timestamp: serverTimestamp(),
      aprobado: false
    });

    // Enviar email
    fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: name,
        comentario: comment,
        rating: currentRating
      })
    }).catch(err => console.error('Error enviando email:', err));

    alert('Valoración enviada. Se revisará antes de publicarse.');
    form.reset();
    currentRating = 0;
    updateStars(0);

  } catch (err) {
    if (err.message) alert(err.message);
  } finally {
    isSubmitting = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar';
  }
});

// ESCUCHA EN TIEMPO REAL
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
      comentario: data.comentario || 'Sin comentario',
      rating: data.rating,
      photoURL: data.photoURL || null,
      expanded: false
    });
  });
  todasLasReseñas = nuevas;
  renderReviews();
});

// Función de traducción usando window.translations
function tr(key) {
  if (window.translations && window.translations[key]) {
    return window.translations[key];
  }
  return key;
}

// Escuchar cuando script.js cargue las traducciones
document.addEventListener('translationsLoaded', () => {
  renderReviews();
});

// RENDER DE RESEÑAS
function renderReviews() {
  reviewsContainer.innerHTML = "";
  const lista = mostrandoTodas ? todasLasReseñas : todasLasReseñas.slice(0, 3);
  lista.forEach((r) => {
    const div = document.createElement("div");
    div.classList.add("review-card");

    const comentarioSeguro = String(r.comentario || tr('reviews.noComment'));
    const textoCorto = comentarioSeguro.length > 120 ? comentarioSeguro.slice(0, 120) + "..." : comentarioSeguro;

    const h3 = document.createElement("h3");
    h3.textContent = r.nombre;
    div.appendChild(h3);

    const starsP = document.createElement("p");
    starsP.classList.add("stars-display");
    starsP.textContent = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
    div.appendChild(starsP);

    const p = document.createElement("p");
    p.classList.add("review-text");
    p.textContent = r.expanded ? comentarioSeguro : textoCorto;
    div.appendChild(p);

    if (comentarioSeguro.length > 120) {
      const btnVerMas = document.createElement("button");
      btnVerMas.classList.add("ver-mas");
      btnVerMas.type = "button";
      btnVerMas.innerText = r.expanded ? tr('reviews.viewLess') : tr('reviews.viewMore');
      btnVerMas.addEventListener("click", () => {
        r.expanded = !r.expanded;
        renderReviews();
      });
      div.appendChild(btnVerMas);
    }

    if (r.photoURL) {
      const img = document.createElement("img");
      img.src = r.photoURL;
      img.alt = tr('reviews.photoAlt');
      img.loading = "lazy";
      div.appendChild(img);
    }

    reviewsContainer.appendChild(div);
  });

  // Botón global
  verTodasBtn.textContent = mostrandoTodas ? tr('reviews.viewAllLess') : tr('reviews.viewAll');
}

// BOTÓN GLOBAL "VER TODAS"
if (verTodasBtn) {
  verTodasBtn.addEventListener("click", () => {
    mostrandoTodas = !mostrandoTodas;
    renderReviews();
  });
}
