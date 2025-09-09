document.addEventListener("DOMContentLoaded", function () {
    // Selecciona los elementos de los piñones y el menú
    const leftGear = document.querySelector(".gears-left");
    const rightGear = document.querySelector(".gears-right");
    const menuIcon = document.getElementById("menu-icon");
    const menu = document.getElementById("menu");
    const popup = document.getElementById("popup");
    const popupContent = document.querySelector(".popup-content");
    const closePopup = document.getElementById("close-popup");
    const popupImage = document.getElementById("popup-image");
    const popupCaption = document.getElementById("popup-caption");
    const popupVideo = document.getElementById("popup-video");
    const videoSource = document.getElementById("popup-video-source");
    const videoCaption = document.getElementById("popup-video-caption");
    const prevBtn = document.getElementById("prev");
    const nextBtn = document.getElementById("next");
    const languageIcon = document.getElementById('language-icon');
    const languageSelector = document.getElementById('language-selector');
    const elementsToTranslate = document.querySelectorAll('[data-i18n]');

    
        let currentMediaIndex = 0;
        let currentMedia = [];
        let isVideo = false;
        
function cargarContenidoPorIdioma() {
    const idioma = detectarIdiomaNavegador();
    document.documentElement.lang = idioma;
    languageSelector.value = idioma; 
    loadTranslations(idioma);
}
             
        
  // --- Función para la Miniatura Dinámica ---
const miniaturaImagen = document.getElementById("miniatura-imagen");
const imagenesMiniatura = [
    "images/mecanizados/Acumulador de gots/1.jpg",
    "images/mecanizados/Acumulador de gots/2.jpg",
    "images/mecanizados/Escaire/1.jpg",
    "images/mecanizados/Escaire/2.jpg",
    "images/mecanizados/Escaire/3.jpg",
    "images/mecanizados/Galeria/1.jpg",
    "images/mecanizados/Galeria/2.webp",
    "images/mecanizados/Galeria/3.jpg",
    "images/mecanizados/Galeria/4.webp",
    "images/mecanizados/Galeria/6.webp",
    "images/mecanizados/Galeria/7.jpg",
    "images/mecanizados/Galeria/8.webp",
    "images/mecanizados/Galeria/9.jpg",
    "images/mecanizados/Pasadors encarenats/1.jpg",
    "images/mecanizados/Pasadors encarenats/2.jpg",
];
let indiceMiniatura = 0;

// Cambiar imágenes automáticamente cada 3 segundos
setInterval(() => {
    indiceMiniatura = (indiceMiniatura + 1) % imagenesMiniatura.length;
    miniaturaImagen.src = imagenesMiniatura[indiceMiniatura];
}, 3000);

// --- Función para la Miniatura Dinámica 1 ---
const miniaturaImagen1 = document.getElementById("miniatura-imagen1");
const imagenesMiniatura1 = [
    "images/3d/Galeria/1.jpeg",
    "images/3d/Galeria/2.jpeg",
    "images/3d/Galeria/3.jpeg",
    "images/3d/Galeria/4.jpeg",
    "images/3d/Galeria/6.jpeg",
    "images/3d/Galeria/8.jpeg",
    "images/3d/Galeria/9.jpeg",
    "images/3d/Suport_manillar/Sm.jpeg",
    "images/3d/Suport_manillar/Sm_1.jpeg",
    "images/3d/Suport_manillar/Sm_2.jpeg",
    "images/3d/Suport_manillar/Sm_3.jpeg",
    "images/3d/Suport_manillar/Sm_4.jpeg",
];
let indiceMiniatura1 = 0;

// Cambiar imágenes automáticamente cada 3 segundos
setInterval(() => {
    indiceMiniatura1 = (indiceMiniatura1 + 1) % imagenesMiniatura1.length;
    miniaturaImagen1.src = imagenesMiniatura1[indiceMiniatura1];
}, 3000);


// Abrir popup desde miniatura
const miniatura = document.querySelector(".miniatura-dinamica");
miniatura.addEventListener("click", function () {
    cleanVideo(); // Limpiar el estado del video
    currentMedia = [...imagenesMiniatura]; // Usar las imágenes de la miniatura
    currentMediaIndex = 0; // Mostrar desde la primera imagen
    isVideo = false; // Asegurarse de que no sea un video
    showMedia(currentMediaIndex, "Galería");
});

// Abrir popup desde miniatura1
const miniatura1 = document.querySelector(".miniatura-dinamica1");
miniatura1.addEventListener("click", function () {
    cleanVideo(); // Limpiar el estado del video
    currentMedia = [...imagenesMiniatura1]; // Usar las imágenes de la miniatura
    currentMediaIndex = 0; // Mostrar desde la primera imagen
    isVideo = false; // Asegurarse de que no sea un video
    showMedia(currentMediaIndex, "Galería");
});

 // Mostrar el selector al hacer clic en el icono
    languageIcon.addEventListener('click', function () {
        languageSelector.style.display = 'block';
    });

    // Ocultar el selector al elegir un idioma
    languageSelector.addEventListener('change', function () {
        languageSelector.style.display = 'none';
    });

// Función para cargar el archivo de traducción
const loadTranslations = (lang) => {
    fetch(`../locales/${lang}.json`)
        .then(response => response.json())
        .then(translations => {
            // Traducción de textos normales
            elementsToTranslate.forEach(element => {
                const key = element.getAttribute('data-i18n');
                if (translations[key]) {
                    element.innerHTML = translations[key]; // Cambiado de textContent a innerHTML
                }
            });

            // 🔹 Traducción de placeholders
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                if (translations[key]) {
                    el.setAttribute('placeholder', translations[key]);
                }
            });
        })
        .catch(error => console.error('Error loading translations:', error));
};


// Cambiar idioma al seleccionar una opción
languageSelector.addEventListener('change', (event) => {
    const selectedLanguage = event.target.value;
    loadTranslations(selectedLanguage);
});

// Función para detectar el idioma del navegador
function detectarIdiomaNavegador() {
    const idioma = navigator.language || navigator.userLanguage;
    return idioma.split('-')[0]; // Obtiene el código del idioma (es, ca, en)
}

// Función para cargar el contenido según el idioma
function cargarContenidoPorIdioma() {
    const idioma = detectarIdiomaNavegador();
    if (idioma === 'es') {
        document.documentElement.lang = 'es';
        languageSelector.value = 'es';
        loadTranslations('es');
    } else if (idioma === 'ca') {
        document.documentElement.lang = 'ca';
        languageSelector.value = 'ca';
        loadTranslations('ca');
    } else {
        document.documentElement.lang = 'en';
        languageSelector.value = 'en';
        loadTranslations('en');
    }
}

// Llama a la función al cargar la página
cargarContenidoPorIdioma();


    // Función para rotar los piñones en función del desplazamiento vertical (scroll)
    function rotateGears() {
        const rotation = window.scrollY / 5; // Controla la velocidad del giro
        if (leftGear && rightGear) {
            rightGear.style.transform = `rotate(${rotation}deg)`;
            leftGear.style.transform = `rotate(-${rotation}deg)`; // Gira en sentido contrario
        }
    }

    // Animación de piñones al cargar la página
    setTimeout(() => {
        if (leftGear && rightGear) {
            leftGear.classList.add('gear-animate');
            rightGear.classList.add('gear-animate');
        }
    }, 100);

    // Escuchar el evento de scroll para animar los piñones
    window.addEventListener("scroll", function () {
        rotateGears();
    });

    // Mostrar el menú al hacer clic sobre el icono
    if (menuIcon && menu) {
        menuIcon.addEventListener("click", function () {
            menu.classList.toggle("show");
        });
    }

    // Cerrar el menú al seleccionar un enlace y desplazarse suavemente
    const menuLinks = menu ? menu.querySelectorAll("a") : [];
    menuLinks.forEach(link => {
        link.addEventListener("click", function (event) {
            event.preventDefault(); // Prevenir el comportamiento por defecto
            const targetId = this.getAttribute("href"); // Obtener el ID del objetivo
            const targetElement = document.querySelector(targetId); // Seleccionar el elemento objetivo

            // Desplazarse suavemente hacia el elemento
            window.scrollTo({
                top: targetElement.offsetTop - 80, // Restar el alto del encabezado
                behavior: "smooth" // Efecto de desplazamiento suave
            });

            menu.classList.remove("show"); // Ocultar el menú
        });
    });
        // Seleccionar contenedores de imágenes
        const imageContainers = document.querySelectorAll(".image-container");
    
        imageContainers.forEach(container => {
            const img = container.querySelector("img");
            const caption = container.querySelector(".image-caption");
            const images = JSON.parse(container.getAttribute("data-images"));
            const videoSrc = container.getAttribute("data-video");
    
            img.addEventListener("click", function () {
                cleanVideo(); // Asegurarse de limpiar cualquier video previo
                currentMedia = videoSrc ? [videoSrc].concat(images) : images;
                currentMediaIndex = 0;
                isVideo = !!videoSrc;
                showMedia(currentMediaIndex, caption.textContent);
            });
        });
    
        // Función para mostrar imágenes o videos en el popup
        function showMedia(index, captionText) {
            popupCaption.textContent = captionText;
            cleanVideo(); // Asegurarse de limpiar cualquier video previo
            popup.style.display = "flex";
    
            if (index === 0 && isVideo) {
                popupImage.style.display = "none";
                popupVideo.style.display = "block";
                videoSource.src = currentMedia[index];
                popupVideo.load();
                videoCaption.textContent = captionText;
                videoCaption.style.display = 'block';
            } else {
                popupVideo.style.display = "none";
                popupImage.src = currentMedia[index];
                popupImage.style.display = "block";
            }
        }
    
        // Función para limpiar el video
        function cleanVideo() {
            popupVideo.pause();
            videoSource.src = '';
            popupVideo.style.display = "none";
            videoCaption.style.display = "none";
        }
    
        // Botón "Anterior"
        prevBtn.addEventListener("click", function () {
            currentMediaIndex = (currentMediaIndex === 0) ? currentMedia.length - 1 : currentMediaIndex - 1;
            showMedia(currentMediaIndex, popupCaption.textContent);
        });
    
        // Botón "Siguiente"
        nextBtn.addEventListener("click", function () {
            currentMediaIndex = (currentMediaIndex === currentMedia.length - 1) ? 0 : currentMediaIndex + 1;
            showMedia(currentMediaIndex, popupCaption.textContent);
        });
    
        // Cerrar el popup
        closePopup.addEventListener("click", function () {
            popup.style.display = "none";
            cleanVideo();
        });
    
        popup.addEventListener("click", function (event) {
            if (event.target === popup) {
                popup.style.display = "none";
                cleanVideo();
            }
        });
    
        // Scroll para navegación en dispositivos móviles
        let scrollTimeout;
        popup.addEventListener("wheel", function (event) {
            clearTimeout(scrollTimeout); // Evitar múltiples eventos seguidos
            scrollTimeout = setTimeout(() => {
                if (event.deltaY > 0) {
                    // Scroll hacia abajo, mostrar siguiente media
                    currentMediaIndex = (currentMediaIndex === currentMedia.length - 1) ? 0 : currentMediaIndex + 1;
                } else if (event.deltaY < 0) {
                    // Scroll hacia arriba, mostrar media anterior
                    currentMediaIndex = (currentMediaIndex === 0) ? currentMedia.length - 1 : currentMediaIndex - 1;
                }
                showMedia(currentMediaIndex, popupCaption.textContent);
            }, 100);
            event.preventDefault(); // Evita el scroll de fondo
        });
    });
 





