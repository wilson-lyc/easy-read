import type { EasyReadSettings } from "./types";

export const DEFAULT_SETTINGS: EasyReadSettings = {
  openaiApiKey: "",
  openaiBaseUrl: "https://api.openai.com/v1",
  openaiModel: "gpt-4o-mini",
  targetLang: "中文",
  sourceLang: "auto",
  enablePDF: true,
  maxChunkTokens: 2000,
};
