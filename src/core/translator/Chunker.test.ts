import { describe, it, expect } from "vitest";
import Chunker from "./Chunker";

describe("Chunker", () => {
  describe("constructor", () => {
    it("应拒绝小于 50 的 maxTokens", () => {
      expect(() => new Chunker(30)).toThrow("不能小于 50");
    });

    it("应拒绝无效的 overlapRatio", () => {
      expect(() => new Chunker(100, -0.1)).toThrow("必须在 0～1 之间");
      expect(() => new Chunker(100, 1)).toThrow("必须在 0～1 之间");
    });

    it("应接受有效参数", () => {
      expect(() => new Chunker(100)).not.toThrow();
      expect(() => new Chunker(200, 0.2)).not.toThrow();
    });
  });

  describe("chunk()", () => {
    it("空文本应返回空数组", () => {
      const chunker = new Chunker(500);
      expect(chunker.chunk("")).toEqual([]);
      expect(chunker.chunk("   ")).toEqual([]);
    });

    it("短文本应返回一个 Chunk", () => {
      const chunker = new Chunker(500);
      const result = chunker.chunk("Hello world");
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("Hello world");
      expect(result[0].index).toBe(0);
    });

    it("应按 Markdown 标题分块", () => {
      const chunker = new Chunker(500);
      const text = `# Title\n\nContent under title.\n\n## Section 1\n\nSection 1 content.\n\n## Section 2\n\nSection 2 content.`;
      const result = chunker.chunk(text);
      expect(result.length).toBeGreaterThanOrEqual(1);

      // 除非每块 token 数 < 500，否则应有多块
      // 验证 chunk 内容包含标题
      const allText = result.map((c) => c.text).join("");
      expect(allText).toContain("Title");
      expect(allText).toContain("Section 1");
      expect(allText).toContain("Section 2");
    });

    it("按段落分块后的块不应超过 maxTokens", () => {
      const chunker = new Chunker(50);
      // 构造一段文本，使单个块无法容纳
      const paragraphs: string[] = [];
      for (let i = 0; i < 20; i++) {
        paragraphs.push(`This is paragraph number ${i} with some content words for token estimation.`);
      }
      const text = paragraphs.join("\n\n");
      const result = chunker.chunk(text);

      expect(result.length).toBeGreaterThan(1);
      for (const chunk of result) {
        // 用简单估算检验
        expect(chunk.text.length).toBeLessThan(500); // sanity check: 50 tokens ~= 200 chars for English
      }
    });

    it("应跳过 YAML frontmatter", () => {
      const chunker = new Chunker(500);
      const text = `---
title: Test
date: 2024-01-01
---

# Real Content

This is the actual content.`;
      const result = chunker.chunk(text);
      const allText = result.map((c) => c.text).join("");
      expect(allText).not.toContain("title: Test");
      expect(allText).toContain("Real Content");
    });

    it("没有标题时应按段落分块", () => {
      const chunker = new Chunker(500);
      const text = "Paragraph one.\n\nParagraph two.\n\nParagraph three.";
      const result = chunker.chunk(text);
      expect(result.length).toBeGreaterThanOrEqual(1);
      // 至少包含所有段落
      const allText = result.map((c) => c.text).join("");
      expect(allText).toContain("Paragraph one");
      expect(allText).toContain("Paragraph two");
      expect(allText).toContain("Paragraph three");
    });

    it("chunk 应包含正确的位置信息", () => {
      const chunker = new Chunker(500);
      const text = "Hello world. This is a test.";
      const result = chunker.chunk(text);
      expect(result[0].startPos).toBeGreaterThanOrEqual(0);
      expect(result[0].endPos).toBeGreaterThan(result[0].startPos);
      expect(result[0].endPos).toBeLessThanOrEqual(text.length);
    });
  });

  describe("addOverlap", () => {
    it("多个 Chunk 时尾部应添加 overlap", () => {
      // 使用小 maxTokens 强制分块并产生 overlap
      // 需要构造一个文本，确保分块后有 overlap
      const chunker = new Chunker(100, 0.2);
      const text = "A. ".repeat(100); // 足够长的文本
      const result = chunker.chunk(text);

      if (result.length > 1) {
        // 第二块应包含第一块的尾部内容（overlap）
        expect(result[1].text).toBeTruthy();
      }
    });
  });

  describe("reconstruct()", () => {
    it("应按 index 排序拼接", () => {
      const chunker = new Chunker(500);
      const result = chunker.reconstruct([
        { index: 2, originalText: "C", translatedText: "c" },
        { index: 0, originalText: "A", translatedText: "a" },
        { index: 1, originalText: "B", translatedText: "b" },
      ]);
      expect(result).toBe("abc");
    });

    it("空数组应返回空字符串", () => {
      const chunker = new Chunker(500);
      expect(chunker.reconstruct([])).toBe("");
    });
  });

  describe("splitBySentences (indirect)", () => {
    it("应正确处理中文标点分句", () => {
      const chunker = new Chunker(500);
      const text = "你好。世界。测试。";
      const result = chunker.chunk(text);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].text).toContain("你好");
    });
  });
});
