import { describe, it, expect, vi, beforeEach } from "vitest";
import OpenAIAdapter from "./OpenAIAdapter";

const MOCK_API_KEY = "sk-test123";

function createMockFetch() {
  return vi.fn();
}

describe("OpenAIAdapter", () => {
  let adapter: OpenAIAdapter;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    adapter = new OpenAIAdapter(MOCK_API_KEY);
    mockFetch = createMockFetch();
    vi.stubGlobal("fetch", mockFetch);
  });

  describe("translate()", () => {
    it("应正确解析正常响应", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "你好", role: "assistant" }, finish_reason: "stop", index: 0 }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      });

      const result = await adapter.translate({
        text: "Hello",
        sourceLang: "auto",
        targetLang: "中文",
      });

      expect(result.translatedText).toBe("你好");
      expect(result.usage?.totalTokens).toBe(15);
      expect(result.model).toBe("gpt-4o-mini");
    });

    it("应使用自定义模型", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "你好", role: "assistant" }, finish_reason: "stop", index: 0 }],
        }),
      });

      await adapter.translate({
        text: "Hello",
        sourceLang: "auto",
        targetLang: "中文",
        model: "gpt-4o",
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.model).toBe("gpt-4o");
    });

    it("应发送正确的请求格式", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "你好", role: "assistant" }, finish_reason: "stop", index: 0 }],
        }),
      });

      await adapter.translate({
        text: "Hello world",
        sourceLang: "auto",
        targetLang: "中文",
      });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe("https://api.openai.com/v1/chat/completions");

      const body: { model: string; messages: { role: string }[]; stream: boolean } = JSON.parse(call[1].body);
      expect(body.stream).toBe(false);
      expect(body.messages[0].role).toBe("system");
      expect(body.messages[1].role).toBe("user");
      expect(body.messages[1].content).toBe("Hello world");
      expect(call[1].headers.Authorization).toBe("Bearer sk-test123");
    });

    it("401 时应抛出可读错误", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(
        adapter.translate({ text: "Hello", sourceLang: "auto", targetLang: "中文" })
      ).rejects.toThrow("API Key 无效");
    });

    it("429 时应抛出 Rate Limit 错误", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      await expect(
        adapter.translate({ text: "Hello", sourceLang: "auto", targetLang: "中文" })
      ).rejects.toThrow("请求过于频繁");
    });

    it("500 时应抛出服务不可用错误", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        adapter.translate({ text: "Hello", sourceLang: "auto", targetLang: "中文" })
      ).rejects.toThrow("服务暂时不可用");
    });

    it("空响应时应返回空字符串", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "", role: "assistant" }, finish_reason: "stop", index: 0 }],
        }),
      });

      const result = await adapter.translate({
        text: "",
        sourceLang: "auto",
        targetLang: "中文",
      });

      expect(result.translatedText).toBe("");
    });

    it("应使用自定义 baseUrl", async () => {
      const customAdapter = new OpenAIAdapter(MOCK_API_KEY, "https://custom.example.com/v1");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "hi", role: "assistant" }, finish_reason: "stop", index: 0 }],
        }),
      });

      await customAdapter.translate({ text: "Hello", sourceLang: "auto", targetLang: "中文" });

      expect(mockFetch.mock.calls[0][0]).toBe("https://custom.example.com/v1/chat/completions");
    });
  });

  describe("translateStream()", () => {
    function createMockStream(chunks: string[]): ReadableStream {
      const encoder = new TextEncoder();
      return new ReadableStream({
        async start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      });
    }

    it("应逐块输出流式内容", async () => {
      const sseChunks = [
        'data: {"choices":[{"delta":{"content":"你好"},"finish_reason":null,"index":0}]}\n',
        'data: {"choices":[{"delta":{"content":"世界"},"finish_reason":null,"index":0}]}\n',
        "data: [DONE]\n",
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStream(sseChunks),
      });

      const results: string[] = [];
      for await (const chunk of adapter.translateStream({
        text: "Hello world",
        sourceLang: "auto",
        targetLang: "中文",
      })) {
        results.push(chunk);
      }

      expect(results).toEqual(["你好", "世界"]);
    });

    it("流式模式应设置 stream=true", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStream(["data: [DONE]\n"]),
      });

      for await (const _ of adapter.translateStream({
        text: "Hello",
        sourceLang: "auto",
        targetLang: "中文",
      })) {
        // consume
      }

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.stream).toBe(true);
    });

    it("错误时应抛出异常", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const stream = adapter.translateStream({
        text: "Hello",
        sourceLang: "auto",
        targetLang: "中文",
      });

      await expect(async () => {
        for await (const _ of stream) {
          // should throw
        }
      }).rejects.toThrow("API Key 无效");
    });

    it("响应体为空时应抛出错误", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
      });

      const stream = adapter.translateStream({
        text: "Hello",
        sourceLang: "auto",
        targetLang: "中文",
      });

      await expect(async () => {
        for await (const _ of stream) {
          // should throw
        }
      }).rejects.toThrow("响应体不可读");
    });

    it("应忽略非 data: 开头的行", async () => {
      const sseChunks = [
        ': comment\n',
        'data: {"choices":[{"delta":{"content":"A"},"finish_reason":null,"index":0}]}\n',
        'ignored line\n',
        "data: [DONE]\n",
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockStream(sseChunks),
      });

      const results: string[] = [];
      for await (const chunk of adapter.translateStream({
        text: "Hello",
        sourceLang: "auto",
        targetLang: "中文",
      })) {
        results.push(chunk);
      }

      expect(results).toEqual(["A"]);
    });
  });

  describe("estimateTokens()", () => {
    it("英文文本应使用 4 chars/token", () => {
      const tokens = adapter.estimateTokens("Hello world");
      // 11 chars / 4 = 2.75 → ceil 3
      expect(tokens).toBe(3);
    });

    it("中文文本应使用 2 chars/token", () => {
      const tokens = adapter.estimateTokens("你好世界");
      // 4 CJK chars / 2 = 2
      expect(tokens).toBe(2);
    });

    it("混合文本应分别计算", () => {
      const tokens = adapter.estimateTokens("Hello 你好");
      // 5 ASCII / 4 = 1.25 → 2
      // 2 CJK / 2 = 1
      // total = 3
      expect(tokens).toBe(3);
    });

    it("空文本返回 0", () => {
      expect(adapter.estimateTokens("")).toBe(0);
    });
  });
});
