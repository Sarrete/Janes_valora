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

onSnapshot(q, (snapshot) => {
  reviewsContainer.innerHTML = '';
  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement('div');
    div.classList.add('review');
    div.innerHTML = `
      <h3>${escapeHtml(data.nombre)}</h3>
      <p class="stars-display">
        ${'★'.repeat(data.rating)}${'☆'.repeat(5 - data.rating)}
      </p>
      <p>${escapeHtml(data.comentario)}</p>
      ${data.photoURL ? `<img src="${data.photoURL}" alt="Foto valoración">` : ''}
    `;
    reviewsContainer.appendChild(div);
  });
});

// 8) UTILIDADES
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}
