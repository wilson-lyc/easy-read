import type { TranslateRequest, TranslateResponse } from "../core/translator/types";

/**
 * LLM Provider 抽象接口
 * 所有 LLM 提供商适配器必须实现此接口。
 */
export interface LLMProvider {
  /** 唯一标识符，如 "openai"、"anthropic" */
  readonly id: string;
  /** 人类可读的名称，如 "OpenAI"、"Anthropic Claude" */
  readonly name: string;
  /** 是否支持流式输出 */
  readonly supportsStreaming: boolean;

  /**
   * 翻译文本（非流式）
   * @param request 翻译请求
   * @returns 翻译响应
   */
  translate(request: TranslateRequest): Promise<TranslateResponse>;

  /**
   * 翻译文本（流式）
   * 逐块返回翻译结果字符串，适合实时展示。
   * @param request 翻译请求
   * @returns 异步可迭代的翻译结果片段
   */
  translateStream(request: TranslateRequest): AsyncIterable<string>;

  /**
   * 估算文本的 Token 数量
   * @param text 文本
   * @returns 估算的 Token 数
   */
  estimateTokens(text: string): number;
}

/** Provider 工厂接口 */
export interface ProviderFactory {
  /** Provider 唯一标识 */
  readonly id: string;
  /** 创建 Provider 实例 */
  create(settings: Record<string, string>): LLMProvider;
  /** 需要的配置字段名列表 */
  readonly requiredSettings: string[];
}
