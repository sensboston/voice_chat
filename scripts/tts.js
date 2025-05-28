// tts.js
// OpenAI TTS: fetch, cache in localStorage, and playback.

import { drawIndicator } from "./draw.js";

export default class TTS {
  /**
   * @param {Settings} settings - shared settings instance
   */
  constructor(settings) {
    this.settings   = settings;
    this.current    = null;
  }

  detectLang(text) {
    if (!this.settings.detectLang) return "en";
    return /[а-яА-Я]/.test(text) ? "ru" : "en";
  }

  /** Speak text; returns when audio playback finishes */
  async speak(text) {
    if (!this.settings.apiKey) {
      throw new Error("API key not set");
    }

    const lang  = this.detectLang(text);
    const voice = { ru: "alloy", en: "onyx" }[lang];
    const cacheKey = `tts_${lang}_${voice}_${text}`;

    drawIndicator("darkmagenta");

    let url = localStorage.getItem(cacheKey);
    if (!url) {
      const resp = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.settings.apiKey}`
        },
        body: JSON.stringify({ model: "tts-1", voice, input: text })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        drawIndicator("LightGray");
        throw new Error(err.error?.message || "TTS request failed");
      }
      const blob = await resp.blob();
      url = await new Promise(res => {
        const fr = new FileReader();
        fr.onloadend = () => res(fr.result);
        fr.readAsDataURL(blob);
      });
      try { localStorage.setItem(cacheKey, url); } catch {}
    }

    await new Promise(resolve => {
      const audio = new Audio(url);
      this.current = audio;
      audio.onended = () => { this.current = null; drawIndicator("LightGray"); resolve(); };
      audio.onerror = ()  => { this.current = null; drawIndicator("LightGray"); resolve(); };
      audio.play();
    });
  }

  cancel() {
    if (this.current) {
      this.current.pause();
      this.current = null;
      drawIndicator("LightGray");
    }
  }
}
