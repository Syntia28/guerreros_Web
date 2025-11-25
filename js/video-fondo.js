// Intenta reproducir el video de fondo. Algunos navegadores bloquean autoplay si no está en mute o
// si detectan interacción faltante; este script fuerza la reproducción y muestra un botón para iniciar
// manualmente si falla.
document.addEventListener('DOMContentLoaded', function () {
    const video = document.getElementById('videoFondo');

    if (!video) {
        console.warn('videoFondo no encontrado en el DOM');
        return;
    }

    // Intentar reproducir y manejar promesas/errores
    function tryPlay() {
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                // Reproducción automática exitosa
                console.log('Reproducción automática del video de fondo iniciada');
            }).catch((error) => {
                console.warn('Autoplay bloqueado o fallo al reproducir:', error);
                // Crear botón para que el usuario inicie el video
                showPlayButton();
            });
        }
    }

    function showPlayButton() {
        // Evitar duplicar el botón
        if (document.getElementById('playVideoBtn')) return;

        const btn = document.createElement('button');
        btn.id = 'playVideoBtn';
        btn.textContent = 'Reproducir fondo';
        btn.style.position = 'fixed';
        btn.style.bottom = '20px';
        btn.style.left = '20px';
        btn.style.zIndex = '9999';
        btn.style.padding = '10px 14px';
        btn.style.background = '#F5BE27';
        btn.style.color = '#000';
        btn.style.border = 'none';
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';

        btn.addEventListener('click', function () {
            video.muted = true; // asegurar muted para permitir autoplay en muchos casos
            video.play().then(() => {
                btn.remove();
            }).catch((err) => {
                console.error('Error al reproducir manualmente el video:', err);
            });
        });

        document.body.appendChild(btn);
    }

    // Si el video está cargado, probar reproducir; si no, esperar al evento canplay
    if (video.readyState >= 3) {
        tryPlay();
    } else {
        video.addEventListener('canplay', tryPlay);
        // Timeout como fallback
        setTimeout(tryPlay, 2000);
    }
});
