import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { loadAiPP3Config } from "../config.js";

const config = loadAiPP3Config();

export const openaiCompatible = createOpenAICompatible({
  baseURL:
    config.openaiBaseUrl ??
    process.env.OPENAI_BASE_URL ??
    "https://openrouter.ai/api/v1",
  apiKey: config.openaiApiKey ?? process.env.OPENAI_API_KEY,
  name: "openai-compatible",
  headers: {
    "HTTP-Referer": "https://github.com/tychenjiajun/art", // Optional. Site URL for rankings on openrouter.ai.
    "X-Title":
      "Art - AI-driven RAW photo processor that generates optimized PP3 profiles for RawTherapee", // Optional. Site title for rankings on openrouter.ai.
  },
});
