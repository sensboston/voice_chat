// stt.js
// Microphone capture, voice-activity detection, recording and Whisper transcription.
// Stops all processing while `window.paused` is true.

export default class STT {
  /**
   * @param {Settings} settings             – shared settings instance
   * @param {(text: string, err?: any) => void} onTranscript – callback when text or error ready
   */
  constructor(settings, onTranscript) {
    this.settings     = settings;
    this.onTranscript = onTranscript;

    this.audioCtx   = null;
    this.analyser   = null;
    this.recorder   = null;

    this.isRecording     = false;
    this.isTranscribing  = false;
    this.isWaiting       = false; // set externally by app when waiting for LLM

    this.chunks      = [];
    this.silenceMark = null;
  }

  /** Initialise mic, analyser, recorder and start VAD loop */
  async init() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("getUserMedia not supported");
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    this.audioCtx         = new AudioContext();
    this.analyser         = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;

    const source = this.audioCtx.createMediaStreamSource(stream);
    source.connect(this.analyser);

    this.recorder = new MediaRecorder(stream);
    this.recorder.ondataavailable = e => this.chunks.push(e.data);
    this.recorder.onstop          = () => this.processRecording();

    requestAnimationFrame(() => this.detectLoop());
  }

  /** Main voice-activity loop */
  detectLoop() {
    requestAnimationFrame(() => this.detectLoop());

    // Pause: forcibly stop recording and skip analysis
    if (window.paused) {
      if (this.isRecording) {
        this.isRecording = false;
        this.recorder.stop();
        this.chunks = [];
      }
      return;
    }

    const energy = this.getEnergy();
    const now    = this.audioCtx.currentTime;

    if (energy > this.settings.threshold) {
      if (!this.isRecording) {
        this.isRecording = true;
        this.chunks = [];
        this.recorder.start();
      }
      this.silenceMark = null;
    } else if (this.isRecording) {
      if (!this.silenceMark) {
        this.silenceMark = now;
      } else if (now - this.silenceMark > this.settings.delay) {
        this.isRecording = false;
        this.recorder.stop();
      }
    }
  }

  /** Short-term energy in 300–4000 Hz */
  getEnergy() {
    const data = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(data);

    const nyquist = this.audioCtx.sampleRate / 2;
    const low     = Math.floor((300  / nyquist) * data.length);
    const high    = Math.ceil ((4000 / nyquist) * data.length);

    let sum = 0;
    for (let i = low; i < high; i++) {
      const db = data[i];
      if (db > -100) sum += Math.pow(10, db / 10);
    }
    return sum / (high - low);
  }

  /** Finish recording: length check + Whisper call */
  async processRecording() {
    this.isTranscribing = true;

    const blob = new Blob(this.chunks, { type: this.recorder.mimeType });
    this.chunks = [];

    const kb = (await blob.arrayBuffer()).byteLength / 1000;
    if (kb < this.settings.recordLenKb) {
      this.isTranscribing = false;
      return;
    }

    try {
      const fd = new FormData();
      fd.append("file", blob, "clip.webm");
      fd.append("model", "whisper-1");

      const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.settings.apiKey}` },
        body: fd
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error?.message || "Transcription failed");
      }

      const text = (await resp.json()).text.trim();
      this.isTranscribing = false;
      this.onTranscript(text);
    } catch (e) {
      this.isTranscribing = false;
      this.onTranscript("", e);
    }
  }
}
