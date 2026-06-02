/**
 * PDF 文本提取与清洗模块
 *
 * 从 Obsidian 内置 PDF 预览视图中提取选中文本，
 * 处理连字符断词、换行规范化、Unicode 清理等排版 artifact。
 *
 * 依赖 Obsidian 内置 PDF 渲染引擎的 Selection API，
 * 不引入第三方 PDF 解析库。
 */
export default class PDFParser {
  /**
   * 判断当前叶子是否为 PDF 视图
   */
  isPDFView(leaf: unknown): boolean {
    if (!leaf || typeof leaf !== "object") return false;
    const view = (leaf as { view?: { getViewType?: () => string } }).view;
    if (!view || typeof view.getViewType !== "function") return false;
    return view.getViewType() === "pdf";
  }

  /**
   * 获取 PDF 视图中的选中文本原始内容
   * @returns 选中文本，若无选中则返回空字符串
   */
  getSelectionText(): string {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      return "";
    }
    return selection.toString();
  }

  /**
   * 清洗 PDF 文本
   *
   * 处理管线：
   * 1. 合并连字符断词（trans-\nlation → translation）
   * 2. 替换换行为空格（保留双换行表示的段落）
   * 3. 移除软连字 (U+00AD) 和零宽字符
   * 4. 首尾修剪
   */
  cleanText(raw: string): string {
    if (!raw) return raw;

    let text = raw;

    // Step 1: 合并连字符断词
    // 匹配 字母-换行 模式并合并
    text = text.replace(/([a-zA-Z])-\n([a-zA-Z])/g, "$1$2");
    text = text.replace(/([a-zA-Z])-\r\n([a-zA-Z])/g, "$1$2");
    text = text.replace(/([a-zA-Z])-\r([a-zA-Z])/g, "$1$2");

    // Step 2: 规整换行
    // 保留段落双换行
    text = text.replace(/\r\n/g, "\n");
    // 将连续多个换行压缩为双换行（段落分隔）
    text = text.replace(/\n{3,}/g, "\n\n");
    // 单换行替换为空格（PDF 中人工换行）
    text = text.replace(/(?<=\S)\n(?=\S)/g, " ");

    // Step 3: 移除 Unicode 控制字符
    text = text.replace(/­/g, ""); // 软连字 (soft hyphen)
    text = text.replace(/​/g, ""); // 零宽空格
    text = text.replace(/‌/g, ""); // 零宽非连接符
    text = text.replace(/‍/g, ""); // 零宽连接符
    text = text.replace(/﻿/g, ""); // BOM

    // Step 4: 合并多余空格
    text = text.replace(/[ \t]+/g, " ");
    text = text.replace(/^[ \t]+/gm, "");
    text = text.replace(/[ \t]+$/gm, "");

    // Step 5: 修剪首尾
    text = text.trim();

    return text;
  }

  /**
   * 获取选中文本在 PDF 页面上的位置
   * @returns 坐标和页码，无选中时返回 null
   */
  getSelectionPosition(): { x: number; y: number; page: number } | null {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (!rect) return null;

    // 估算页码（通过 container 的滚动位置/高度）
    const containerEl = range.startContainer.parentElement?.closest(".pdf-container") as HTMLElement | null;
    let page = 1;
    if (containerEl) {
      const pageEl = range.startContainer.parentElement?.closest(".pdf-page") as HTMLElement | null;
      if (pageEl?.dataset?.page) {
        page = parseInt(pageEl.dataset.page, 10) || 1;
      }
    }

    return {
      x: rect.left,
      y: rect.top,
      page,
    };
  }
}
