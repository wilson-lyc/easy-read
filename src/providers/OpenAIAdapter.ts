import type { LLMProvider } from "./interface";
import type { TranslateRequest, TranslateResponse } from "../core/translator/types";

/** OpenAI API 聊天消息 */
interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** OpenAI API 请求体（非流式） */
interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature: number;
  stream: boolean;
}

/** OpenAI API 响应体（非流式） */
interface OpenAIResponse {
  id: string;
  choices: {
    message: OpenAIMessage;
    finish_reason: string;
    index: number;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** OpenAI API 流式数据块 */
interface OpenAIStreamChunk {
  choices: {
    delta: { content?: string };
    finish_reason: string | null;
    index: number;
  }[];
}

/** 构建默认翻译 System Prompt */
function buildSystemPrompt(sourceLang: string, targetLang: string): string {
  return `你是专业翻译。请将以下文本从 ${sourceLang} 翻译为 ${targetLang}。

要求：
1. 专业术语请使用行业内通用译法
2. 仅输出翻译结果，不要添加解释

原文：`;
}

/** 简单 Token 估算：英文约 4 chars/token，中文约 2 chars/token */
function estimateTokens(text: string): number {
  let charCount = 0;
  let cjkCount = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3000 && code <= 0x303f)) {
      cjkCount++;
    } else {
      charCount++;
    }
  }
  return Math.ceil(cjkCount / 2) + Math.ceil(charCount / 4);
}

/**
 * OpenAI 适配器
 *
 * 通过 OpenAI Chat Completions API 实现翻译。
 * 支持流式 (SSE) 和非流式模式。
 */
export default class OpenAIAdapter implements LLMProvider {
  readonly id = "openai";
  readonly name = "OpenAI";
  readonly supportsStreaming = true;

  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(
    apiKey: string,
    baseUrl = "https://api.openai.com/v1",
    defaultModel = "gpt-4o-mini"
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.defaultModel = defaultModel;
  }

  async translate(request: TranslateRequest): Promise<TranslateResponse> {
    const model = request.model ?? this.defaultModel;
    const systemPrompt = request.systemPrompt ?? buildSystemPrompt(request.sourceLang, request.targetLang);

    const body: OpenAIRequest = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: request.text },
      ],
      temperature: 0.3,
      stream: false,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw OpenAIAdapter.buildError(response);
    }

    const data = (await response.json()) as OpenAIResponse;
    const translatedText = data.choices[0]?.message?.content ?? "";

    return {
      translatedText,
      model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  async *translateStream(request: TranslateRequest): AsyncIterable<string> {
    const model = request.model ?? this.defaultModel;
    const systemPrompt = request.systemPrompt ?? buildSystemPrompt(request.sourceLang, request.targetLang);

    const body: OpenAIRequest = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: request.text },
      ],
      temperature: 0.3,
      stream: true,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw OpenAIAdapter.buildError(response);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("OpenAI: 响应体不可读");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") return;

          try {
            const chunk = JSON.parse(data) as OpenAIStreamChunk;
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // 跳过无法解析的块
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  estimateTokens(text: string): number {
    return estimateTokens(text);
  }

  /**
   * 将 HTTP 错误响应转换为包含可读消息的错误
   */
  private static buildError(response: Response): Error {
    const status = response.status;
    let message: string;

    switch (status) {
      case 401:
        message = "OpenAI: API Key 无效，请在设置中检查";
        break;
      case 429:
        message = "OpenAI: 请求过于频繁（Rate Limit），请稍后重试";
        break;
      case 500:
      case 502:
      case 503:
        message = `OpenAI: 服务暂时不可用 (${status})，请稍后重试`;
        break;
      default:
        message = `OpenAI: API 请求失败 (${status})`;
        break;
    }

    return new Error(message);
  }
}
