import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// 1) CONFIG FIREBASE — RELLENA ESTO
const firebaseConfig = {
     ***REMOVED***
        authDomain: "valoraciones-a8350.firebaseapp.com",
        projectId: "valoraciones-a8350",
        storageBucket: "valoraciones-a8350.appspot.com",
        messagingSenderId: "286602851936",
        appId: "1:286602851936:web:e1d4d11bfe1391dd1c7505"
    };

// 2) APP Y DB
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 3) DOM
const form = document.getElementById('rating-form');
const stars = document.querySelectorAll('#star-input .star');
const ratingValueInput = document.getElementById('rating-value');
const reviewsList = document.getElementById('reviews-list');
const averageRatingEl = document.getElementById('average-rating');
const totalCountEl = document.getElementById('rating-count');

let currentRating = 0;

// 4) ESTRELLAS
stars.forEach((star, idx) => {
  const value = idx + 1;

  star.addEventListener('mouseenter', () => highlight(value));
  star.addEventListener('mouseleave', () => highlight(currentRating));
  star.addEventListener('click', () => {
    currentRating = value;
    ratingValueInput.value = String(value);
    highlight(currentRating);
  });
});

function highlight(value) {
  stars.forEach((s, i) => {
    const active = i < value;
    s.classList.toggle('active', active);
    s.setAttribute('aria-checked', active ? 'true' : 'false');
  });
}

// 5) SUBMIT
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = form.name.value.trim();
  const comment = form.comment.value.trim();
  const rating = Number(ratingValueInput.value);

  if (!rating) { alert('Selecciona una puntuación de 1 a 5.'); return; }
  if (!name || !comment) { alert('Completa tu nombre y comentario.'); return; }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    await addDoc(collection(db, 'valoraciones'), {
      nombre: name,
      comentario: comment,
      estrellas: rating,
      createdAt: serverTimestamp(),
      visible: true
    });

    form.reset();
    currentRating = 0;
    highlight(0);
  } catch (err) {
    console.error(err);
    alert('No se pudo enviar la valoración. Inténtalo de nuevo.');
  } finally {
    submitBtn.disabled = false;
  }
});

// 6) TIEMPO REAL
const q = query(collection(db, 'valoraciones'), orderBy('createdAt', 'desc'));
onSnapshot(q, (snapshot) => {
  const reviews = [];
  let sum = 0;

  snapshot.forEach((doc) => {
    const d = doc.data();
    if (d && d.visible !== false) {
      reviews.push({ id: doc.id, ...d });
      sum += Number(d.estrellas) || 0;
    }
  });

  renderList(reviews);
  renderStats(reviews.length, sum);
});

// 7) RENDER
function renderList(reviews) {
  reviewsList.innerHTML = reviews.map(r => `
    <li class="review">
      <div class="review-header">
        <span class="review-name">${escapeHtml(r.nombre)}</span>
        <span class="review-stars">${renderStars(r.estrellas)}</span>
      </div>
      <p class="review-comment">${escapeHtml(r.comentario)}</p>
      <time class="review-date">${formatDate(r.createdAt)}</time>
    </li>
  `).join('');
}

function renderStats(count, sum) {
  const avg = count ? (sum / count) : 0;
  averageRatingEl.textContent = avg.toFixed(1);
  totalCountEl.textContent = `(${count})`;
}

function renderStars(n) {
  const value = Math.round(Number(n) || 0);
  const full = '★'.repeat(value);
  const empty = '☆'.repeat(5 - value);
  return `${full}${empty}`;
}

function formatDate(ts) {
  try {
    if (ts && ts.toDate) return ts.toDate().toLocaleDateString();
  } catch {}
  return '';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}
