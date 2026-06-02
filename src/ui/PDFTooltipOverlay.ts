import { App, Plugin } from "obsidian";
import PDFParser from "../core/pdf/PDFParser";
import TranslationTooltip from "./TranslationTooltip";

/**
 * PDF 划词翻译触发层
 *
 * 检测 PDF 视图中的文本选中事件，提取并清洗文本后，
 * 通过共享的 TranslationTooltip 显示浮动按钮，
 * 翻译结果统一由侧边栏展示。
 */
export default class PDFTooltipOverlay {
  private app: App;
  private pdfParser: PDFParser;
  private tooltip: TranslationTooltip;
  private plugin: Plugin;

  constructor(
    app: App,
    tooltip: TranslationTooltip,
    plugin: Plugin
  ) {
    this.app = app;
    this.pdfParser = new PDFParser();
    this.tooltip = tooltip;
    this.plugin = plugin;

    this.registerPDFSelectionListener();
  }

  /**
   * 注册 PDF 视图的选中事件监听
   */
  private registerPDFSelectionListener(): void {
    this.plugin.registerDomEvent(document, "mouseup", () => {
      const leaf = this.app.workspace.activeLeaf;
      if (!leaf || !this.pdfParser.isPDFView(leaf)) {
        return;
      }

      const rawText = this.pdfParser.getSelectionText();
      if (!rawText) {
        this.tooltip.hide();
        return;
      }

      const cleanedText = this.pdfParser.cleanText(rawText);
      if (!cleanedText) {
        this.tooltip.hide();
        return;
      }

      const position = this.pdfParser.getSelectionPosition();
      if (!position) {
        this.tooltip.hide();
        return;
      }

      // 复用浮动按钮，位置在 PDF 选区上方
      this.tooltip.showButtonAt(cleanedText, position.x, position.y);
    });
  }

  destroy(): void {
    // tooltip 由主模块管理生命周期
  }
}
