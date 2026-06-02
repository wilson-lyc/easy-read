export interface EasyReadSettings {
  /** API Key */
  openaiApiKey: string;
  /** API Base URL（兼容 OpenAI 协议的服务） */
  openaiBaseUrl: string;
  /** 模型名 */
  openaiModel: string;
  /** 目标语言 */
  targetLang: string;
  /** 源语言（auto 表示自动检测） */
  sourceLang: string;
  /** 是否启用 PDF 划词翻译 */
  enablePDF: boolean;
  /** 全文翻译时每块最大 token 数 */
  maxChunkTokens: number;
}
