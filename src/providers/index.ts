import type { LLMProvider } from "./interface";
import OpenAIAdapter from "./OpenAIAdapter";

export type { LLMProvider, ProviderFactory } from "./interface";
export { OpenAIAdapter };

/**
 * Provider 注册表
 * 按 id 索引所有可用的 Provider 工厂。
 * 新 Provider 在此注册。
 */
export const providerRegistry: Record<string, new (...args: never[]) => LLMProvider> = {
  openai: OpenAIAdapter as unknown as new (...args: never[]) => LLMProvider,
};
