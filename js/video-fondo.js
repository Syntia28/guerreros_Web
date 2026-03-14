document.addEventListener('DOMContentLoaded', function () {
    const video = document.getElementById('videoFondo');

    if (!video) {
        console.warn('videoFondo no encontrado en el DOM');
        return;
    }

    // Obtener la URL base correcta para Render
    const getVideoPath = () => {
        const basePath = window.location.pathname;
        const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        
        // En Render y producción, usar ruta absoluta desde la raíz
        if (isProduction) {
            return '/video/fondo.mp4';
        }
        return 'video/fondo.mp4';
    };

    // Intentar cargar el video con fallbacks
    const videoPath = getVideoPath();
    const videoSource = video.querySelector('source');
    
    if (videoSource) {
        videoSource.src = videoPath;
        console.log('Ruta del video configurada:', videoPath);
    }

    // Manejar errores de carga del video
    video.addEventListener('error', function () {
        const errorCode = video.error?.code;
        const errorMessage = {
            1: 'MEDIA_ERR_ABORTED - Carga abortada',
            2: 'MEDIA_ERR_NETWORK - Error de red',
            3: 'MEDIA_ERR_DECODE - No se pudo decodificar',
            4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - Formato no soportado'
        };
        
        console.error('❌ Error al cargar el video:', errorMessage[errorCode] || 'Error desconocido');
        console.log('Ruta intentada:', videoPath);
        console.log('URL actual:', window.location.href);
        console.log('Hostname:', window.location.hostname);
        
        // Mostrar notificación visual del error
        showVideoErrorNotification();
    });

    // Verificar si el video se cargó correctamente
    video.addEventListener('loadedmetadata', function () {
        console.log('✅ Video cargado correctamente. Duración:', video.duration, 'segundos');
    });

    video.addEventListener('canplay', function () {
        console.log('✅ Video listo para reproducir');
    });

    // Intentar reproducir y manejar promesas/errores
    function tryPlay() {
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('✅ Reproducción automática del video de fondo iniciada');
            }).catch((error) => {
                console.warn('⚠️ Autoplay bloqueado:', error.message);
                showPlayButton();
            });
        }
    }

    function showPlayButton() {
        if (document.getElementById('playVideoBtn')) return;

        const btn = document.createElement('button');
        btn.id = 'playVideoBtn';
        btn.textContent = '▶ Reproducir fondo';
        btn.style.position = 'fixed';
        btn.style.bottom = '20px';
        btn.style.left = '20px';
        btn.style.zIndex = '9999';
        btn.style.padding = '12px 16px';
        btn.style.background = '#F5BE27';
        btn.style.color = '#000';
        btn.style.border = 'none';
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = 'bold';
        btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';

        btn.addEventListener('click', function () {
            video.muted = true;
            video.play().then(() => {
                btn.remove();
            }).catch((err) => {
                console.error('Error al reproducir manualmente:', err);
            });
        });

        document.body.appendChild(btn);
    }

    function showVideoErrorNotification() {
        if (document.getElementById('videoErrorNotif')) return;

        const notif = document.createElement('div');
        notif.id = 'videoErrorNotif';
        notif.textContent = '⚠️ Video de fondo no disponible. Abre la consola (F12) para más detalles.';
        notif.style.position = 'fixed';
        notif.style.bottom = '20px';
        notif.style.left = '20px';
        notif.style.zIndex = '9999';
        notif.style.padding = '12px 16px';
        notif.style.background = '#ff6b6b';
        notif.style.color = '#fff';
        notif.style.borderRadius = '8px';
        notif.style.fontSize = '14px';
        notif.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';

        setTimeout(() => notif.remove(), 5000);
        document.body.appendChild(notif);
    }

    // Si el video está cargado, probar reproducir; si no, esperar al evento canplay
    if (video.readyState >= 3) {
        tryPlay();
    } else {
        video.addEventListener('canplay', tryPlay);
        setTimeout(tryPlay, 3000);
    }
});
