const video = document.getElementById('videoGuerreros');
const canvas = document.getElementById('canvasGuerreros');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

let animationId = null;
let isProcessing = false;
let isVideoReady = false;

// Obtener la URL base correcta para Render
const getVideoPath = () => {
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (isProduction) {
        return '/video/GUERREROS.mp4';
    }
    return 'video/GUERREROS.mp4';
};

// Verificar si existen los elementos
if (!video || !canvas) {
    console.error('❌ Elementos críticos no encontrados:', { video: !!video, canvas: !!canvas });
} else {
    console.log('✅ Elementos videoGuerreros y canvasGuerreros encontrados');

    // Configurar ruta del video en el elemento source
    const videoSource = video.querySelector('source');
    const videoPath = getVideoPath();
    
    if (videoSource) {
        videoSource.src = videoPath;
        console.log('Ruta GUERREROS configurada en source:', videoPath);
    } else {
        // Fallback: establecer directamente en el video
        video.src = videoPath;
        console.log('Ruta GUERREROS configurada directamente en video:', videoPath);
    }
}

const CHROMA_KEY = {
    hueMin: 60,
    hueMax: 170,
    satMin: 0.2,
    satMax: 1.0,
    valMin: 0.2,
    valMax: 1.0,
    threshold: 0.4,
    smoothing: 0.1
};

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Establecer tamaño CSS (lo que ve el usuario)
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Establecer tamaño real del canvas (para alta resolución)
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    // Escalar el contexto para mantener las coordenadas en el rango esperado
    ctx.scale(dpr, dpr);
}

function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    let s = max === 0 ? 0 : diff / max;
    let v = max;

    if (diff !== 0) {
        if (max === r) {
            h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        } else if (max === g) {
            h = ((b - r) / diff + 2) / 6;
        } else {
            h = ((r - g) / diff + 4) / 6;
        }
    }

    return { h: h * 360, s, v };
}

function chromaKey(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const hsv = rgbToHsv(r, g, b);

        const isInHueRange = hsv.h >= CHROMA_KEY.hueMin && hsv.h <= CHROMA_KEY.hueMax;
        const isInSatRange = hsv.s >= CHROMA_KEY.satMin && hsv.s <= CHROMA_KEY.satMax;
        const isInValRange = hsv.v >= CHROMA_KEY.valMin && hsv.v <= CHROMA_KEY.valMax;

        if (isInHueRange && isInSatRange && isInValRange) {
            const hueDist = Math.min(
                Math.abs(hsv.h - 120) / 60,
                1
            );

            const greenness = (1 - hueDist) * hsv.s * hsv.v;

            if (greenness > CHROMA_KEY.threshold) {
                data[i + 3] = 0;
            } else if (greenness > CHROMA_KEY.threshold - CHROMA_KEY.smoothing) {
                const alpha = ((greenness - (CHROMA_KEY.threshold - CHROMA_KEY.smoothing)) / CHROMA_KEY.smoothing);
                data[i + 3] = Math.floor((1 - alpha) * 255);
            }
        }

        if (data[i + 3] > 0) {
            const avgRB = (r + b) / 2;
            const greenExcess = g - avgRB;

            if (greenExcess > 5) {
                const correction = Math.min(greenExcess * 0.8, g - avgRB);
                data[i + 1] = Math.max(0, Math.floor(g - correction));

                const boost = correction * 0.15;
                data[i] = Math.min(255, Math.floor(r + boost));
                data[i + 2] = Math.min(255, Math.floor(b + boost));
            }
        }
    }

    return imageData;
}

function processFrame() {
    if (video.paused || video.ended || isProcessing) {
        return;
    }

    isProcessing = true;

    try {
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = Math.round(canvas.getBoundingClientRect().width);
        const displayHeight = Math.round(canvas.getBoundingClientRect().height);

        ctx.clearRect(0, 0, displayWidth, displayHeight);

        ctx.drawImage(video, 0, 0, displayWidth, displayHeight);

        const imageData = ctx.getImageData(0, 0, displayWidth, displayHeight);

        const processedData = chromaKey(imageData);

        ctx.putImageData(processedData, 0, 0);

    } catch (error) {
        console.error('Error procesando frame:', error);
    }

    isProcessing = false;
    animationId = requestAnimationFrame(processFrame);
}

function startVideo() {
    if (isVideoReady) return;
    
    resizeCanvas();

    const playPromise = video.play();
    
    if (playPromise !== undefined) {
        playPromise
            .then(() => {
                console.log('✅ Video GUERREROS iniciado correctamente');
                isVideoReady = true;
                processFrame();
            })
            .catch(error => {
                console.warn('⚠️ Autoplay bloqueado en video GUERREROS:', error.message);
                // Intentar con click
                document.body.addEventListener('click', handleplayOnClick, { once: true });
            });
    } else {
        console.log('PlayPromise undefined, intentando play directo');
        processFrame();
    }
}

function handleplayOnClick() {
    video.muted = true;
    video.play()
        .then(() => {
            console.log('✅ Video GUERREROS iniciado por click');
            isVideoReady = true;
            processFrame();
        })
        .catch(e => console.error('❌ Error en segundo intento:', e));
}

// Event listeners mejorados
if (video) {
    video.addEventListener('loadedmetadata', () => {
        console.log('✅ Metadatos del video cargados');
        startVideo();
    });

    video.addEventListener('loadeddata', () => {
        console.log('✅ Video data cargado, listo para reproducir');
        if (!isVideoReady) startVideo();
    });

    video.addEventListener('canplay', () => {
        console.log('✅ Video GUERREROS listo para reproducción');
        if (!isVideoReady) startVideo();
    });

    video.addEventListener('error', (e) => {
        console.error('❌ Error al cargar video GUERREROS:', e);
        console.log('Ruta intentada:', video.src || 'No configurada');
    });

    window.addEventListener('resize', resizeCanvas);

    // Iniciar carga
    resizeCanvas();
    video.load();

    // Fallback: intenta después de 2 segundos
    setTimeout(() => {
        if (!isVideoReady && video.readyState >= 2) {
            console.log('Iniciando por timeout');
            startVideo();
        }
    }, 2000);
} else {
    console.warn('⚠️ Element videoGuerreros no encontrado');
}