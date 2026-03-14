const video = document.getElementById('videoGuerreros');
const canvas = document.getElementById('canvasGuerreros');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

let animationId = null;
let isProcessing = false;

// Configurar ruta del video según ambiente
const videoPath = (() => {
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    return isProduction ? '/video/GUERREROS01.mp4' : 'video/GUERREROS01.mp4';
})();

if (video) {
    const videoSource = video.querySelector('source');
    if (videoSource) {
        videoSource.src = videoPath;
    }
    video.src = videoPath;
    console.log('📹 Video path:', videoPath);
}

const CHROMA_KEY = {
    hueMin: 50,      // Más amplio
    hueMax: 180,     // Más amplio
    satMin: 0.1,     // Más bajo para captar verdes desaturados
    satMax: 1.0,
    valMin: 0.1,     // Más bajo para captar verdes oscuros
    valMax: 1.0,
    threshold: 0.2,  // Mucho más bajo
    smoothing: 0.05
};

function resizeCanvas() {
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

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

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Método 1: Si el verde es mucho más alto que rojo y azul
        const isGreenDominated = g > r * 1.3 && g > b * 1.3;
        
        if (isGreenDominated) {
            // Remover pixel verde
            data[i + 3] = 0;
            continue;
        }

        // Método 2: Chroma key clásico HSV
        const hsv = rgbToHsv(r, g, b);

        const isInHueRange = hsv.h >= CHROMA_KEY.hueMin && hsv.h <= CHROMA_KEY.hueMax;
        const isInSatRange = hsv.s >= CHROMA_KEY.satMin && hsv.s <= CHROMA_KEY.satMax;
        const isInValRange = hsv.v >= CHROMA_KEY.valMin && hsv.v <= CHROMA_KEY.valMax;

        if (isInHueRange && isInSatRange && isInValRange) {
            const hueDist = Math.min(Math.abs(hsv.h - 120) / 60, 1);
            const greenness = (1 - hueDist) * hsv.s * hsv.v;

            if (greenness > CHROMA_KEY.threshold) {
                data[i + 3] = 0;
            } else if (greenness > CHROMA_KEY.threshold - CHROMA_KEY.smoothing) {
                const alpha = ((greenness - (CHROMA_KEY.threshold - CHROMA_KEY.smoothing)) / CHROMA_KEY.smoothing);
                data[i + 3] = Math.floor((1 - alpha) * 255);
            }
        }

        // Corregir exceso de verde en píxeles que quedan
        if (data[i + 3] > 0) {
            const avgRB = (r + b) / 2;
            const greenExcess = g - avgRB;

            if (greenExcess > 3) {
                const correction = Math.min(greenExcess * 0.9, g - avgRB);
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
    if (!video || !canvas || isProcessing) {
        animationId = requestAnimationFrame(processFrame);
        return;
    }

    isProcessing = true;

    try {
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = Math.round(canvas.getBoundingClientRect().width);
        const displayHeight = Math.round(canvas.getBoundingClientRect().height);

        // IMPORTANTE: Dibujar el video incluso si está pausado
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        ctx.drawImage(video, 0, 0, displayWidth, displayHeight);

        const imageData = ctx.getImageData(0, 0, displayWidth, displayHeight);
        const processedData = chromaKey(imageData);
        ctx.putImageData(processedData, 0, 0);

    } catch (error) {
        console.error('❌ Error procesando frame:', error);
    }

    isProcessing = false;
    animationId = requestAnimationFrame(processFrame);
}

// Inicializar
function init() {
    if (!video || !canvas) {
        console.error('❌ Video o canvas no encontrado');
        return;
    }

    resizeCanvas();
    
    // Intentar reproducir
    video.muted = true;
    video.play().catch(e => {
        console.warn('⚠️ Autoplay falló:', e.message);
        console.log('⬇️ Haz click para reproducir el video');
    });

    // Iniciar procesamiento de frames independientemente de si se reproduce
    setTimeout(() => {
        console.log('🎬 Iniciando renderizado del canvas...');
        console.log('💡 En Render, ajusta así si ves verde:');
        console.log('   window.CHROMA_KEY.threshold = 0.15');
        console.log('   window.CHROMA_KEY.hueMax = 160');
        processFrame();
    }, 500);
}

// Exponer CHROMA_KEY globalmente para debugging en Render
window.CHROMA_KEY = CHROMA_KEY;
console.log('⚙️ Parámetros Chroma Key expuestos en window.CHROMA_KEY');

// Event listeners
if (video) {
    video.addEventListener('canplay', () => console.log('✅ Video listo'));
    video.addEventListener('play', () => console.log('▶️ Video reproduciendo'));
    video.addEventListener('pause', () => console.log('⏸️ Video pausado'));
    video.addEventListener('error', (e) => console.error('❌ Error video:', e));
    
    // Permitir click para reproducir
    document.addEventListener('click', () => {
        if (video.paused) {
            video.play().catch(e => console.error('Error al reproducir:', e));
        }
    }, { once: true });

    window.addEventListener('resize', resizeCanvas);

    // Cargar y reproducir
    video.load();
    
    // Esperar a que el DOM esté completamente listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
