import { describe, it, expect, vi, beforeEach } from "vitest";
import PDFParser from "./PDFParser";

describe("PDFParser", () => {
  let parser: PDFParser;

  beforeEach(() => {
    parser = new PDFParser();
  });

  describe("cleanText()", () => {
    it("应合并连字符断词 (hyphenation)", () => {
      expect(parser.cleanText("transla-\ntion")).toBe("translation");
      expect(parser.cleanText("some-\nthing")).toBe("something");
      expect(parser.cleanText("knowl-\nedge")).toBe("knowledge");
    });

    it("应合并连字符断词 (CRLF)", () => {
      expect(parser.cleanText("test-\r\ning")).toBe("testing");
    });

    it("应保留段落双换行", () => {
      const result = parser.cleanText("First paragraph.\n\nSecond paragraph.");
      expect(result).toContain("First paragraph.");
      expect(result).toContain("Second paragraph.");
    });

    it("应将单换行替换为空格", () => {
      const result = parser.cleanText("This is a\nlong line");
      expect(result).toBe("This is a long line");
    });

    it("应移除软连字", () => {
      const result = parser.cleanText("un­ambiguous");
      expect(result).toBe("unambiguous");
    });

    it("应移除零宽字符", () => {
      const result = parser.cleanText("in​visible");
      expect(result).toBe("invisible");
    });

    it("应移除 BOM", () => {
      const result = parser.cleanText("﻿Hello");
      expect(result).toBe("Hello");
    });

    it("应合并多余空格", () => {
      const result = parser.cleanText("Hello    world");
      expect(result).toBe("Hello world");
    });

    it("应修剪首尾空白", () => {
      const result = parser.cleanText("  Hello world  ");
      expect(result).toBe("Hello world");
    });

    it("空字符串应返回空字符串", () => {
      expect(parser.cleanText("")).toBe("");
      expect(parser.cleanText("  ")).toBe("");
    });

    it("应处理混合场景", () => {
      const input = "This is a transla-\ntion test.\n\nIt has multi-\nple paragraphs.\nWith soft hy­phen.";
      const result = parser.cleanText(input);
      expect(result).toContain("translation test");
      expect(result).toContain("multiple paragraphs");
      expect(result).toContain("soft hyphen");
      expect(result).toMatch(/test\..*\n\n.*paragraphs/s);
    });
  });

  describe("isPDFView()", () => {
    it("应识别 PDF 视图", () => {
      const leaf = { view: { getViewType: () => "pdf" } };
      expect(parser.isPDFView(leaf)).toBe(true);
    });

    it("应拒绝非 PDF 视图", () => {
      const leaf = { view: { getViewType: () => "markdown" } };
      expect(parser.isPDFView(leaf)).toBe(false);
    });

    it("应安全处理无效输入", () => {
      expect(parser.isPDFView(null)).toBe(false);
      expect(parser.isPDFView(undefined)).toBe(false);
      expect(parser.isPDFView({})).toBe(false);
    });
  });

  describe("getSelectionText()", () => {
    it("无选中时应返回空字符串", () => {
      // window.getSelection 在 jsdom 中默认返回无选中的 selection
      const text = parser.getSelectionText();
      expect(text).toBe("");
    });
  });
});
