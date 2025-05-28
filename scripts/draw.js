// draw.js
// Canvas helpers + minimal UI helpers: indicator, waveform, resize, chat append.

const canvas = document.querySelector(".visualizer");
const ctx    = canvas.getContext("2d");

/**
 * Draw a small colored circle (status indicator) at top-right.
 * @param {string} color
 */
export function drawIndicator(color) {
  const W = canvas.width;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(W - 20, 20, 8, 0, 2 * Math.PI);
  ctx.fill();
}

/**
 * Draw microphone waveform from an AnalyserNode.
 * @param {AnalyserNode} analyser
 */
export function drawWaveform(analyser) {
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "LightGray";
  ctx.fillRect(0, 0, W, H);

  ctx.lineWidth = 1;
  ctx.strokeStyle = "Black";
  ctx.beginPath();

  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  const slice = W / data.length;
  let x = 0;
  for (let i = 0; i < data.length; i++) {
    const y = (data[i] / 128) * (H / 2);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    x += slice;
  }
  ctx.lineTo(W, H / 2);
  ctx.stroke();
}

/** Resize canvas to parent width */
export function resizeCanvas() {
  canvas.width = canvas.parentElement.offsetWidth;
}

/** Append message to chat area */
export function appendChat(text, color) {
  const chat = document.querySelector(".chat");
  const p = document.createElement("p");
  p.textContent = text;
  p.style.padding = "4px 0";
  if (color) p.style.color = color;
  chat.appendChild(p);
  chat.scrollTop = chat.scrollHeight;
}

export { canvas, ctx };
