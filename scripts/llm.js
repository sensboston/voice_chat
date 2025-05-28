// llm.js
// Simple wrapper over the OpenAI Chat Completion endpoint.

export default class LLM {
  /**
   * @param {Settings} settings - shared settings instance
   * @param {string} [systemPrompt]
   */
  constructor(settings, systemPrompt = "Be concise, direct, and avoid explanations.") {
    this.settings     = settings;
    this.systemPrompt = systemPrompt;
  }

  /**
   * Ask the LLM and get a reply.
   * @param {string} userText
   * @returns {Promise<string>}
   */
  async query(userText) {
    if (!this.settings.apiKey) {
      throw new Error("API key not set");
    }

    const payload = {
      model: this.settings.model,
      messages: [
        { role: "system", content: this.systemPrompt },
        { role: "user",   content: userText }
      ]
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.settings.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || "Chat API request failed");
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || "(no reply)";
  }
}
