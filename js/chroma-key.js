const video = document.getElementById('videoGuerreros');
const canvas = document.getElementById('canvasGuerreros');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

let animationId = null;
let isProcessing = false;

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
    resizeCanvas();

    video.play()
        .then(() => {
            console.log('Video iniciado correctamente');
            processFrame();
        })
        .catch(error => {
            console.error('Error al reproducir video:', error);
            document.body.addEventListener('click', function initOnClick() {
                video.play()
                    .then(() => {
                        console.log('Video iniciado después de click');
                        processFrame();
                        document.body.removeEventListener('click', initOnClick);
                    })
                    .catch(e => console.error('Error en segundo intento:', e));
            }, { once: true });
        });
}

video.addEventListener('loadeddata', () => {
    console.log('Video cargado');
    startVideo();
});

video.addEventListener('canplay', () => {
    console.log('Video puede reproducirse');
});

window.addEventListener('resize', resizeCanvas);

resizeCanvas();

if (video.readyState >= 2) {
    startVideo();
}

video.load();