/** 翻译请求 */
export interface TranslateRequest {
  /** 待翻译文本 */
  text: string;
  /** 源语言（auto=自动检测） */
  sourceLang: string;
  /** 目标语言 */
  targetLang: string;
  /** 可选的 System Prompt 覆盖 */
  systemPrompt?: string;
  /** 模型覆盖（不传则用 Provider 默认模型） */
  model?: string;
}

/** Token 使用统计 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** 翻译响应 */
export interface TranslateResponse {
  /** 翻译结果文本 */
  translatedText: string;
  /** 实际使用的模型 */
  model: string;
  /** Token 使用统计（可能为空） */
  usage?: TokenUsage;
}

/** 文本分块 */
export interface Chunk {
  /** 块序号 */
  index: number;
  /** 块文本内容 */
  text: string;
  /** 在原文中的起始偏移 */
  startPos: number;
  /** 在原文中的结束偏移 */
  endPos: number;
}

/** 已翻译的文本块 */
export interface TranslatedChunk {
  index: number;
  originalText: string;
  translatedText: string;
}

/** Provider 注册项 */
export interface ProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
}

/** 侧边栏翻译条目 */
export interface TranslationItem {
  /** 唯一 ID */
  id: string;
  /** 原文 */
  original: string;
  /** 译文 */
  translated: string;
  /** 翻译时间戳 */
  timestamp: number;
  /** 来源：markdown | pdf */
  source: "markdown" | "pdf";
}
