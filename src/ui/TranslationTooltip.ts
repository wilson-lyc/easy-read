import { App, MarkdownView } from "obsidian";

/**
 * 划词翻译触发按钮（Markdown / PDF 通用）
 *
 * 选中文本后在选区附近显示浮动「翻译」按钮，
 * 点击后通过回调执行翻译，结果由侧边栏展示。
 */
export default class TranslationTooltip {
  private app: App;
  private container: HTMLDivElement;
  private selectedText = "";
  private isTranslating = false;
  private onTranslate: (
    text: string,
    source: "markdown" | "pdf"
  ) => Promise<void>;

  constructor(
    app: App,
    onTranslate: (
      text: string,
      source: "markdown" | "pdf"
    ) => Promise<void>
  ) {
    this.app = app;
    this.onTranslate = onTranslate;
    this.container = createDiv({ cls: "easyread-float-btn" });
    this.container.addClass("easyread-float-btn-hidden");

    // 创建按钮
    const btn = this.container.createEl("button", {
      cls: "easyread-float-btn-inner",
      text: "翻译",
    });
    btn.addEventListener("click", () => this.doTranslate());

    document.body.appendChild(this.container);
  }

  /**
   * 在选区位置显示翻译按钮
   */
  showButton(): boolean {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return false;

    const editor = view.editor;
    const selection = editor.getSelection();
    if (!selection || selection.trim().length === 0) return false;

    this.selectedText = selection;

    const head = editor.getCursor("head");
    const coords = (
      editor as unknown as {
        coordsAtPos(
          pos: { line: number; ch: number }
        ): { left: number; top: number } | null;
      }
    ).coordsAtPos(head);
    if (!coords) return false;

    this.container.removeClass("easyread-float-btn-hidden");
    this.container.style.left = `${coords.left}px`;
    this.container.style.top = `${coords.top - 36}px`;
    return true;
  }

  /**
   * 快捷键直达翻译（跳过按钮状态）
   */
  async translateNow(): Promise<void> {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return;

    const selection = view.editor.getSelection();
    if (!selection || selection.trim().length === 0) return;

    this.selectedText = selection;
    await this.doTranslate();
  }

  private async doTranslate(): Promise<void> {
    if (!this.selectedText || this.isTranslating) return;
    this.isTranslating = true;
    this.hide();

    try {
      await this.onTranslate(this.selectedText, "markdown");
    } finally {
      this.isTranslating = false;
    }
  }

  /** 在指定坐标显示按钮（PDF 用） */
  showButtonAt(text: string, x: number, y: number): void {
    if (!text.trim()) return;
    this.selectedText = text;
    this.container.removeClass("easyread-float-btn-hidden");
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y - 36}px`;
  }

  /** PDF 翻译触发 */
  async translatePDF(): Promise<void> {
    if (!this.selectedText || this.isTranslating) return;
    this.isTranslating = true;
    this.hide();
    try {
      await this.onTranslate(this.selectedText, "pdf");
    } finally {
      this.isTranslating = false;
    }
  }

  hide(): void {
    this.container.addClass("easyread-float-btn-hidden");
  }

  isVisible(): boolean {
    return !this.container.hasClass("easyread-float-btn-hidden");
  }

  destroy(): void {
    this.container.remove();
  }
}
