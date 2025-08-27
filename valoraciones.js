// 1) IMPORTS
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

// Mensaje de carga inicial
reviewsContainer.innerHTML = '<p class="loading">Cargando valoraciones...</p>';

// 5) ESTRELLAS INTERACTIVAS
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

// 6) ENVÍO DEL FORMULARIO
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const comment = document.getElementById('comment').value.trim();
  const photoFile = document.getElementById('photo').files[0];

  if (!name) return alert('Por favor, ingresa tu nombre.');
  if (currentRating === 0) return alert('Por favor, selecciona una valoración.');

  try {
    let photoURL = null;

    // 🔹 Subida a Cloudinary con preset UNSIGNED
    if (photoFile) {
      const data = new FormData();
      data.append("file", photoFile);
      data.append("upload_preset", "valoraciones_janes"); // 👈 tu preset unsigned
      data.append("folder", "valoraciones"); // opcional

      const res = await fetch("https://api.cloudinary.com/v1_1/dcsez2e0d/image/upload", {
        method: "POST",
        body: data,
      });

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

    alert('Valoración enviada. Se revisará antes de publicarse.');
    form.reset();
    currentRating = 0;
    updateStars(0);

  } catch (err) {
    console.error(err);
    alert('Error al enviar la valoración: ' + (err?.message || err));
  }
});

// 7) ESCUCHA EN TIEMPO REAL — SOLO RESEÑAS APROBADAS
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
      photoURL: data.photoURL || null
    });
  });

  todasLasReseñas = nuevas;

  if (todasLasReseñas.length > 0) {
    renderReviews();
  } else {
    reviewsContainer.innerHTML = '<p class="no-data">No hay valoraciones aprobadas todavía.</p>';
  }
});

function renderReviews() {
  reviewsContainer.innerHTML = "";

  const lista = mostrandoTodas ? todasLasReseñas : todasLasReseñas.slice(0, 3);

  lista.forEach(r => {
    const div = document.createElement("div");
    div.classList.add("review-card");

    const comentarioSeguro = String(r.comentario || 'Sin comentario');
    const textoCorto = comentarioSeguro.length > 120
      ? comentarioSeguro.slice(0, 120) + "..."
      : comentarioSeguro;

    div.innerHTML = `
      <h3>${escapeHtml(r.nombre)}</h3>
      <p class="stars-display">
        ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
      </p>
      <p class="review-text">${escapeHtml(textoCorto)}</p>
      ${comentarioSeguro.length > 120 ? '<button class="ver-mas">Ver más</button>' : ""}
      ${r.photoURL ? `<img src="${r.photoURL}" alt="Foto valoración">` : ""}
    `;

    reviewsContainer.appendChild(div);

    const btnVerMas = div.querySelector(".ver-mas");
    if (btnVerMas) {
      btnVerMas.addEventListener("click", () => {
        const p = div.querySelector(".review-text");
        if (p.innerText.endsWith("...")) {
          p.innerText = comentarioSeguro;
          btnVerMas.innerText = "Ver menos";
        } else {
          p.innerText = textoCorto;
          btnVerMas.innerText = "Ver más";
        }
      });
    }
  });
}

// 8) BOTÓN "VER TODAS"
if (verTodasBtn) {
  verTodasBtn.addEventListener("click", () => {
    mostrandoTodas = !mostrandoTodas;
    renderReviews();
    verTodasBtn.innerText = mostrandoTodas ? "Ver menos valoraciones" : "Ver todas las valoraciones";
  });
}

// 9) FUNCION PARA ESCAPAR HTML
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[s])
  );
}
