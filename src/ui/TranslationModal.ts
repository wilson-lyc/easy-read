import { App, Modal, Setting, TFile } from "obsidian";

export type OutputMode = "overwrite" | "new";

export interface TranslationOptions {
  sourceLang: string;
  targetLang: string;
  outputMode: OutputMode;
}

/**
 * 全文翻译设置弹窗
 *
 * 让用户选择源语言、目标语言和输出方式，
 * 确认后触发全文翻译流程。
 */
export default class TranslationModal extends Modal {
  private options: TranslationOptions;
  private onConfirm: (options: TranslationOptions) => void;
  private file: TFile | null;

  constructor(
    app: App,
    file: TFile | null,
    onConfirm: (options: TranslationOptions) => void
  ) {
    super(app);
    this.file = file;
    this.onConfirm = onConfirm;
    this.options = {
      sourceLang: "auto",
      targetLang: "中文",
      outputMode: "new",
    };
  }

  onOpen(): void {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "EasyRead — 全文翻译" });

    if (this.file) {
      contentEl.createEl("p", {
        text: `当前文件: ${this.file.path}`,
        cls: "easyread-modal-filepath",
      });
    }

    // 源语言
    new Setting(contentEl)
      .setName("源语言")
      .setDesc("auto 表示自动检测")
      .addText((text) =>
        text
          .setPlaceholder("auto")
          .setValue(this.options.sourceLang)
          .onChange((value) => {
            this.options.sourceLang = value || "auto";
          })
      );

    // 目标语言
    new Setting(contentEl)
      .setName("目标语言")
      .setDesc("翻译的目标语言")
      .addText((text) =>
        text
          .setPlaceholder("中文")
          .setValue(this.options.targetLang)
          .onChange((value) => {
            this.options.targetLang = value || "中文";
          })
      );

    // 输出方式
    new Setting(contentEl)
      .setName("输出方式")
      .setDesc("覆盖原文或在新建笔记中保存翻译结果")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("new", "新建笔记")
          .addOption("overwrite", "覆盖原文")
          .setValue(this.options.outputMode)
          .onChange((value) => {
            this.options.outputMode = value as OutputMode;
          })
      );

    // 按钮区域
    const buttonContainer = contentEl.createDiv({
      cls: "easyread-modal-buttons",
    });
    buttonContainer.style.marginTop = "20px";
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "8px";
    buttonContainer.style.justifyContent = "flex-end";

    const cancelBtn = buttonContainer.createEl("button", {
      text: "取消",
      cls: "mod-cta",
    });
    cancelBtn.style.background = "var(--interactive-normal)";
    cancelBtn.addEventListener("click", () => this.close());

    const confirmBtn = buttonContainer.createEl("button", {
      text: "开始翻译",
      cls: "mod-cta",
    });
    confirmBtn.addEventListener("click", () => {
      this.onConfirm(this.options);
      this.close();
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
