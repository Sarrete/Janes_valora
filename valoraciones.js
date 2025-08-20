// 1) IMPORTS
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, where, orderBy, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

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
const storage = getStorage(app);

// 4) ELEMENTOS DOM
const form = document.getElementById('ratingForm');
const stars = document.querySelectorAll('#ratingStars .star');
const reviewsContainer = document.getElementById('reviews');
const verTodasBtn = document.getElementById('verTodasBtn');
let currentRating = 0;

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

    if (photoFile) {
      const storageRef = ref(storage, `valoraciones/${Date.now()}_${photoFile.name}`);
      const snapshot = await uploadBytes(storageRef, photoFile);
      photoURL = await getDownloadURL(snapshot.ref);
    }

    await addDoc(collection(db, 'valoraciones'), {
      nombre: name,
      comentario: comment || 'Sin comentario',
      rating: currentRating,
      photoURL: photoURL || null,
      timestamp: serverTimestamp(),
      aprobado: false // ← siempre false al crear
    });

    alert('Valoración enviada. Se revisará antes de publicarse.');
    form.reset();
    currentRating = 0;
    updateStars(0);

  } catch (err) {
    console.error(err);
    alert('Error al enviar la valoración.');
  }
});

// 7) ESCUCHA EN TIEMPO REAL — SOLO APROBADAS
const q = query(
  collection(db, 'valoraciones'),
  where('aprobado', '==', true),
  orderBy('timestamp', 'desc')
);

let todasLasReseñas = [];
let mostrandoTodas = false;

onSnapshot(q, (snapshot) => {
  todasLasReseñas = [];
  snapshot.forEach(doc => {
    const data = doc.data();

    // Evitar reseñas incompletas o undefined
    if (!data || !data.nombre || !data.comentario || !data.rating) return;

    todasLasReseñas.push({
      nombre: data.nombre,
      comentario: data.comentario,
      rating: data.rating,
      photoURL: data.photoURL || null
    });
  });

  renderReviews();
});

function renderReviews() {
  reviewsContainer.innerHTML = "";

  // Mostrar todas o solo las 3 últimas
  const lista = mostrandoTodas ? todasLasReseñas : todasLasReseñas.slice(0, 3);

  lista.forEach(r => {
    const div = document.createElement("div");
    div.classList.add("review-card");

    // Texto recortado
    const textoCorto = r.comentario.length > 120 ? r.comentario.slice(0, 120) + "..." : r.comentario;

    div.innerHTML = `
      <h3>${escapeHtml(r.nombre)}</h3>
      <p class="stars-display">
        ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
      </p>
      <p class="review-text">${escapeHtml(textoCorto)}</p>
      ${r.comentario.length > 120 ? '<button class="ver-mas">Ver más</button>' : ""}
      ${r.photoURL ? `<img src="${r.photoURL}" alt="Foto valoración">` : ""}
    `;

    reviewsContainer.appendChild(div);

    // Evento "Ver más"
    const btnVerMas = div.querySelector(".ver-mas");
    if (btnVerMas) {
      btnVerMas.addEventListener("click", () => {
        const p = div.querySelector(".review-text");
        if (p.innerText.endsWith("...")) {
          p.innerText = r.comentario;
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

// 9) UTILIDADES
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}
