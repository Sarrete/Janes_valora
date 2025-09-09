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

// Mensaje de carga inicial
reviewsContainer.innerHTML = `<p class="loading">${i18next.t("reviews.loading")}</p>`;

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

// 🔹 Función para detectar código malicioso
function contieneCodigoPeligroso(texto) {
  const patron = /<\s*script|onerror\s*=|onload\s*=|javascript:|<\s*iframe|<\s*img|<\s*svg/i;
  return patron.test(texto);
}

// 6) ENVÍO DEL FORMULARIO
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const comment = document.getElementById('comment').value.trim();
  const photoFile = document.getElementById('photo').files[0];

  if (!name) return alert(i18next.t('reviews.name') + ' ' + i18next.t('reviews.noComment'));
  if (currentRating === 0) return alert(i18next.t('reviews.rating') + ' ' + i18next.t('reviews.noComment'));

  if (contieneCodigoPeligroso(name) || contieneCodigoPeligroso(comment)) {
    return alert(i18next.t('reviews.noComment') + ' contiene código no permitido.');
  }

  try {
    let photoURL = null;

    if (photoFile) {
      const data = new FormData();
      data.append("file", photoFile);
      data.append("upload_preset", "valoraciones_janes");
      data.append("folder", "valoraciones");

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
      comentario: comment || i18next.t('reviews.noComment'),
      rating: currentRating,
      photoURL: photoURL || null,
      timestamp: serverTimestamp(),
      aprobado: false
    });

    alert(i18next.t('reviews.submit') + '. Se revisará antes de publicarse.');
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
      comentario: data.comentario || i18next.t('reviews.noComment'),
      rating: data.rating,
      photoURL: data.photoURL || null
    });
  });

  todasLasReseñas = nuevas;

  if (todasLasReseñas.length > 0) {
    renderReviews();
  } else {
    reviewsContainer.innerHTML = `<p class="no-data">${i18next.t('reviews.noData')}</p>`;
  }
});

// 8) RENDER DE RESEÑAS SEGURO
function renderReviews() {
  reviewsContainer.innerHTML = "";

  const lista = mostrandoTodas ? todasLasReseñas : todasLasReseñas.slice(0, 3);

  lista.forEach(r => {
    const div = document.createElement("div");
    div.classList.add("review-card");

    const comentarioSeguro = String(r.comentario || i18next.t('reviews.noComment'));
    const textoCorto = comentarioSeguro.length > 120
      ? comentarioSeguro.slice(0, 120) + "..."
      : comentarioSeguro;

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

    // Botón "Ver más"
    if (comentarioSeguro.length > 120) {
      const btnVerMas = document.createElement("button");
      btnVerMas.classList.add("ver-mas");
      btnVerMas.innerText = i18next.t("reviews.viewMore");

      btnVerMas.addEventListener("click", () => {
        if (p.innerText.endsWith("...")) {
          p.innerText = comentarioSeguro;
          btnVerMas.innerText = i18next.t("reviews.viewLess");
        } else {
          p.innerText = textoCorto;
          btnVerMas.innerText = i18next.t("reviews.viewMore");
        }
      });

      div.appendChild(btnVerMas);
    }

    // Imagen segura
    if (r.photoURL) {
      const img = document.createElement("img");
      img.src = r.photoURL;
      img.alt = i18next.t("reviews.photoAlt");
      img.loading = "lazy";
      div.appendChild(img);
    }

    reviewsContainer.appendChild(div);
  });
}

// 9) BOTÓN "VER TODAS"
if (verTodasBtn) {
  verTodasBtn.addEventListener("click", () => {
    mostrandoTodas = !mostrandoTodas;
    renderReviews();
    verTodasBtn.innerText = mostrandoTodas
      ? i18next.t("reviews.viewAllLess")
      : i18next.t("reviews.viewAll");
  });
}

// 🔹 Actualizar al cambiar de idioma
i18next.on("languageChanged", () => {
  // Actualiza botones dinámicos
  if (verTodasBtn) {
    verTodasBtn.innerText = mostrandoTodas
      ? i18next.t("reviews.viewAllLess")
      : i18next.t("reviews.viewAll");
  }
  renderReviews(); // refresca reseñas con textos traducidos
});
