// app.js
// Glue code: Settings • STT • LLM • TTS • drawing utilities.

import Settings  from "./settings.js";
import STT       from "./stt.js";
import LLM       from "./llm.js";
import TTS       from "./tts.js";
import {
  drawIndicator,
  drawWaveform,
  resizeCanvas,
  appendChat,
  canvas,
  ctx as canvasCtx
} from "./draw.js";

/* ---------- DOM elements for sidebar toggle ---------- */
const sidebarToggle = document.getElementById("sidebarToggle");
const settingsPanel = document.querySelector(".settings");
if (sidebarToggle && settingsPanel) {
  sidebarToggle.addEventListener("click", () => {
    settingsPanel.classList.toggle("open");
  });
}

/* ---------- State machine ---------- */
const State = Object.freeze({
  IDLE: "idle",
  REC:  "recording",
  STT:  "transcribe",
  WAIT: "wait_reply",
  TTS:  "speaking",
  PAUSE:"paused"
});
let appState   = State.IDLE;
window.paused  = false;

/* ---------- Settings ---------- */
const settings = new Settings();
settings.init(); // binds controls automatically

/* ---------- Modules ---------- */
const stt = new STT(settings, handleTranscript);
const llm = new LLM(settings);
const tts = new TTS(settings);

/* ---------- Derived state helper ---------- */
function refreshState() {
  if (window.paused)         appState = State.PAUSE;
  else if (stt.isRecording)  appState = State.REC;
  else if (stt.isTranscribing) appState= State.STT;
  else if (stt.isWaiting)    appState = State.WAIT;
  else if (tts.currentAudio) appState = State.TTS;
  else                       appState = State.IDLE;
}

/* ---------- UI interactions ---------- */
canvas.addEventListener("click", () => { window.paused = !window.paused; });

/* ---------- Drawing loop ---------- */
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function drawLoop() {
  requestAnimationFrame(drawLoop);

  if (!window.paused && stt.analyser) {
      drawWaveform(stt.analyser);
  }

  refreshState();
  switch (appState) {
    case State.REC:  drawIndicator("red");   break;
    case State.STT:  drawIndicator("blue");  break;
    case State.WAIT: drawIndicator("green"); break;
    case State.TTS:  drawIndicator("blue");  break;
    default:         drawIndicator("LightGray");
  }

  document.getElementById("pausedBanner").style.display = appState === State.PAUSE ? "block" : "none";

}
drawLoop();

/* ---------- Transcript callback ---------- */
async function handleTranscript(text, err) {
  if (err) {
    appendChat("Error: " + err, "red");
    return;
  }
  if (!text) return;

  appendChat("You: " + text);

  try {
    stt.isWaiting = true;
    const reply = await llm.query(text);
    stt.isWaiting = false;

    for (const chunk of chunkify(reply)) {
      appendChat("ChatGPT: " + chunk, "#003366");
      await tts.speak(chunk);
    }
  } catch (e) {
    appendChat("Error: " + e, "red");
  }
}

/* ---------- Utilities ---------- */
function chunkify(text) {
  const max = settings.chunkMaxLen;
  const sentences = text.split(/(?<=[.!?])\s+/);
  const out = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length <= max) cur += s + " ";
    else {
      if (cur.trim()) out.push(cur.trim());
      cur = s + " ";
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/* ---------- Start microphone ---------- */
stt.init().catch(e => appendChat("Error: " + e, "red"));
