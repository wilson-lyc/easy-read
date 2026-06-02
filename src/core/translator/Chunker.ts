import type { Chunk, TranslatedChunk } from "./types";

/**
 * 文本分块器
 *
 * 将长文本按语义单元拆分为适合 LLM Context Window 的块。
 * 分块优先级：Markdown 标题 → 段落 → 句子。
 * 每块尾部预留 10% token 的重叠（Overlap）以保语义连贯。
 */
export default class Chunker {
  private maxTokens: number;
  private overlapRatio: number;

  /**
   * @param maxTokens 每块最大 token 数
   * @param overlapRatio 块间重叠比例（默认 0.1 = 10%）
   */
  constructor(maxTokens: number, overlapRatio = 0.1) {
    if (maxTokens < 50) throw new Error("maxTokens 不能小于 50");
    if (overlapRatio < 0 || overlapRatio >= 1) throw new Error("overlapRatio 必须在 0～1 之间");
    this.maxTokens = maxTokens;
    this.overlapRatio = overlapRatio;
  }

  /**
   * 将文本分块
   * @param text 输入文本
   * @returns 分块数组
   */
  chunk(text: string): Chunk[] {
    if (!text.trim()) return [];

    // 按优先级尝试分块
    let sections = this.splitByHeadings(text);
    if (sections.length === 1) {
      sections = this.splitByParagraphs(text);
    }
    if (sections.length === 1) {
      sections = this.splitBySentences(text);
    }

    // 合并成不超过 maxTokens 的块
    return this.mergeSections(sections, text);
  }

  /**
   * 重构翻译后的文本
   * @param chunks 已翻译的块
   * @returns 完整译文
   */
  reconstruct(chunks: TranslatedChunk[]): string {
    return chunks
      .sort((a, b) => a.index - b.index)
      .map((c) => c.translatedText)
      .join("");
  }

  /**
   * 估算文本的 token 数（启发式）
   */
  private estimateTokens(text: string): number {
    let cjkCount = 0;
    let asciiCount = 0;
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3000 && code <= 0x303f)) {
        cjkCount++;
      } else if (code <= 0x7f) {
        asciiCount++;
      }
    }
    return Math.ceil(cjkCount / 2) + Math.ceil(asciiCount / 4);
  }

  /**
   * 按 Markdown 标题分块
   */
  private splitByHeadings(text: string): string[] {
    const headingRegex = /^#{1,6}\s+/m;
    if (!headingRegex.test(text)) return [text];

    const sections: string[] = [];
    const lines = text.split("\n");
    let current: string[] = [];
    let inFrontmatter = false;

    for (const line of lines) {
      // 跳过 YAML frontmatter
      if (line.trim() === "---") {
        if (inFrontmatter) {
          inFrontmatter = false;
          continue;
        }
        inFrontmatter = true;
        if (current.length > 0) {
          sections.push(current.join("\n"));
          current = [];
        }
        continue;
      }
      if (inFrontmatter) continue;

      if (/^#{1,6}\s+/.test(line) && current.length > 0) {
        sections.push(current.join("\n"));
        current = [line];
      } else {
        current.push(line);
      }
    }
    if (current.length > 0) {
      sections.push(current.join("\n"));
    }

    return sections.length > 0 ? sections : [text];
  }

  /**
   * 按段落（双换行）分块
   */
  private splitByParagraphs(text: string): string[] {
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    return paragraphs.length > 0 ? paragraphs : [text];
  }

  /**
   * 按句子分块
   */
  private splitBySentences(text: string): string[] {
    const sentences = text.split(/(?<=[。！？.!?])\s*/).filter((s) => s.trim().length > 0);
    return sentences.length > 0 ? sentences : [text];
  }

  /**
   * 将小段合并成不超过 maxTokens 的块，并添加 Overlap
   */
  private mergeSections(sections: string[], originalText: string): Chunk[] {
    const chunks: Chunk[] = [];
    let currentText = "";
    let currentStart = 0;
    let buffer = "";

    for (const section of sections) {
      const sectionTokens = this.estimateTokens(section);

      if (this.estimateTokens(currentText + section) <= this.maxTokens) {
        currentText += (currentText ? "\n" : "") + section;
        continue;
      }

      // 当前块已满，保存
      if (currentText) {
        chunks.push(this.makeChunk(chunks.length, currentText, originalText));
      }

      // 如果单个 section 超过 maxTokens，进一步拆分
      if (sectionTokens > this.maxTokens) {
        const subChunks = this.splitOversizedSection(section, originalText);
        chunks.push(...subChunks);
        currentText = "";
      } else {
        currentText = section;
      }
    }

    // 最后一块
    if (currentText) {
      chunks.push(this.makeChunk(chunks.length, currentText, originalText));
    }

    // 添加 Overlap
    return this.addOverlap(chunks);
  }

  /**
   * 处理超过 maxTokens 的大段（按句子拆分）
   */
  private splitOversizedSection(section: string, originalText: string): Chunk[] {
    const chunks: Chunk[] = [];
    let current = "";

    // 先按句子拆分
    const sentences = this.splitBySentences(section);
    if (sentences.length <= 1) {
      // 如果只有一个超长句子，直接作为一块
      return [this.makeChunk(0, section, originalText)];
    }

    for (const sentence of sentences) {
      if (this.estimateTokens(current + sentence) <= this.maxTokens) {
        current += (current ? "" : "") + sentence;
      } else {
        if (current) {
          chunks.push(this.makeChunk(chunks.length, current, originalText));
        }
        current = sentence;
      }
    }
    if (current) {
      chunks.push(this.makeChunk(chunks.length, current, originalText));
    }

    return chunks;
  }

  private makeChunk(index: number, text: string, originalText: string): Chunk {
    const startPos = originalText.indexOf(text);
    return {
      index,
      text,
      startPos: startPos >= 0 ? startPos : 0,
      endPos: startPos >= 0 ? startPos + text.length : text.length,
    };
  }

  /**
   * 在相邻块间插入 Overlap 文本
   */
  private addOverlap(chunks: Chunk[]): Chunk[] {
    if (chunks.length <= 1) return chunks;

    const overlapTokens = Math.floor(this.maxTokens * this.overlapRatio);

    for (let i = 0; i < chunks.length - 1; i++) {
      const current = chunks[i];
      const next = chunks[i + 1];

      // 从当前块尾部取 overlapTokens 对应长度的文本
      const currentTokens = this.estimateTokens(current.text);
      if (currentTokens <= overlapTokens) continue;

      // 按比例截取尾部文本作为 overlap
      const overlapRatio = overlapTokens / currentTokens;
      const overlapLen = Math.floor(current.text.length * overlapRatio);
      const overlapText = current.text.slice(-overlapLen);

      // 将 overlap 文本附加到下一块开头
      if (overlapText) {
        next.text = overlapText + "\n" + next.text;
      }
    }

    return chunks;
  }
}
