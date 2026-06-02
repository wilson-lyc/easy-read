import type { LLMProvider } from "../../providers/interface";
import type { TranslateRequest, TranslateResponse } from "./types";

/**
 * 翻译引擎
 *
 * 编排 Chunker + LLMProvider 完成翻译任务。
 * 对外提供统一的 translate / translateStream / cancel 接口。
 */
export default class Translator {
  private provider: LLMProvider;
  private abortController: AbortController | null = null;

  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  /**
   * 切换底层 LLM Provider
   */
  setProvider(provider: LLMProvider): void {
    this.provider = provider;
  }

  /**
   * 获取当前 Provider
   */
  getProvider(): LLMProvider {
    return this.provider;
  }

  /**
   * 翻译文本（非流式）
   */
  async translate(request: TranslateRequest): Promise<TranslateResponse> {
    this.abortController = new AbortController();

    // 检查是否有文本
    if (!request.text.trim()) {
      return { translatedText: "", model: this.provider.id };
    }

    return this.provider.translate(request);
  }

  /**
   * 翻译文本（流式）
   */
  async *translateStream(request: TranslateRequest): AsyncIterable<string> {
    this.abortController = new AbortController();

    if (!request.text.trim()) {
      return;
    }

    for await (const chunk of this.provider.translateStream(request)) {
      yield chunk;
    }
  }

  /**
   * 取消当前翻译
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * 估算 Token 数
   */
  estimateTokens(text: string): number {
    return this.provider.estimateTokens(text);
  }
}
