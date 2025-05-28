// settings.js
// LocalStorage-backed settings manager with automatic HTML binding.

export default class Settings {
  constructor() {
    this.cfg = {
      apiKey: {
        key: "settings_api_key",
        el:  "apiKeyInput",
        type: String,
        def: ""
      },
      model: {
        key: "settings_model",
        el:  "modelSelect",
        type: String,
        def: "gpt-3.5-turbo"
      },
      thresholdInt: {
        key: "settings_threshold_int",
        el:  "thresholdSlider",
        disp:"thresholdValue",
        type: Number,
        def: 18
      },
      delay: {
        key: "settings_delay",
        el:  "delaySlider",
        disp:"delayValue",
        type: Number,
        def: 1.5
      },
      detectLang: {
        key: "settings_detect_lang",
        el:  "detectLangCheckbox",
        type: v => v === "true",
        ser: v => v,
        def: true
      },
      recordLenKb: {
        key: "settings_record_len_kb",
        el:  "recordingLengthInput",
        type: Number,
        def: 28
      },
      /* new chunk length slider */
      chunkMaxLen: {
        key: "settings_chunk_len",
        el:  "chunkLenSlider",
        disp:"chunkLenValue",
        type: Number,
        def: 250
      }
    };

    this.listeners = {};
    this.values    = {};
  }

  /** Initialize controls and load stored values */
  init() {
    Object.entries(this.cfg).forEach(([prop, c]) => {
      const el = document.getElementById(c.el);
      if (!el) return;

      // load or default
      const raw = localStorage.getItem(c.key);
      const val = raw === null ? c.def : (c.type || String)(raw);
      this.values[prop] = val;

      // push value to UI
      if (el.type === "checkbox") el.checked = val;
      else el.value = val;
      if (c.disp) {
        const d = document.getElementById(c.disp);
        if (d) d.textContent = val;
      }

      // save on user change
      el.addEventListener("input", () => {
        const v = el.type === "checkbox" ? el.checked :
                  el.type === "number"   ? Number(el.value) :
                                            el.value;
        this.save(prop, v);
        if (c.disp) {
          const d = document.getElementById(c.disp);
          if (d) d.textContent = v;
        }
      });
    });
  }

  /** Subscribe to property changes */
  onChange(prop, fn) {
    (this.listeners[prop] = this.listeners[prop] || []).push(fn);
  }

  /* getters */
  get apiKey()       { return this.values.apiKey; }
  get model()        { return this.values.model; }
  get thresholdInt() { return this.values.thresholdInt; }
  get delay()        { return this.values.delay; }
  get detectLang()   { return this.values.detectLang; }
  get recordLenKb()  { return this.values.recordLenKb; }
  get chunkMaxLen()  { return this.values.chunkMaxLen; }

  // derived numeric threshold
  get threshold() { return this.thresholdInt / 1e8; }

  /** Save to localStorage and emit */
  save(prop, val) {
    const c = this.cfg[prop];
    this.values[prop] = val;
    const serial = c.ser ? c.ser(val) : val.toString();
    localStorage.setItem(c.key, serial);
    (this.listeners[prop] || []).forEach(fn => fn(val));
  }
}
