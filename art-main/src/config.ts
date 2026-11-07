import fs from "node:fs";
import path from "node:path";

export type AiPP3Config = {
  openaiApiKey?: string;
  openaiBaseUrl?: string;
};

const CONFIG_FILENAME = "ai-pp3.config.json";

export function loadAiPP3Config(): AiPP3Config {
  const configPath = path.resolve(process.cwd(), CONFIG_FILENAME);
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const config = parsed as Record<string, unknown>;
    return {
      openaiApiKey:
        typeof config.openaiApiKey === "string"
          ? config.openaiApiKey.trim()
          : undefined,
      openaiBaseUrl:
        typeof config.openaiBaseUrl === "string"
          ? config.openaiBaseUrl.trim()
          : undefined,
    };
  } catch {
    return {};
  }
}
