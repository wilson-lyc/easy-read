import { App, MarkdownView, Plugin, PluginSettingTab, Setting, Menu, Notice, TFile, WorkspaceLeaf } from "obsidian";
import type { EasyReadSettings } from "./settings/types";
import { DEFAULT_SETTINGS } from "./settings/defaults";
import OpenAIAdapter from "./providers/OpenAIAdapter";
import Translator from "./core/translator/Translator";
import TranslationTooltip from "./ui/TranslationTooltip";
import TranslationModal from "./ui/TranslationModal";
import PDFTooltipOverlay from "./ui/PDFTooltipOverlay";
import TranslationView, { VIEW_TYPE, type HistoryEntry } from "./ui/TranslationView";
import type { TranslationOptions } from "./ui/TranslationModal";
import Chunker from "./core/translator/Chunker";
import RequestQueue from "./utils/requestQueue";

export default class EasyReadPlugin extends Plugin {
  settings: EasyReadSettings = DEFAULT_SETTINGS;
  translator!: Translator;
  tooltip!: TranslationTooltip;
  pdfOverlay!: PDFTooltipOverlay;

  async onload(): Promise<void> {
    await this.loadSettings();

    // 注册侧边栏视图
    this.registerView(VIEW_TYPE, (leaf: WorkspaceLeaf) => new TranslationView(leaf));

    // 初始化核心模块（Provider + 触发器 + 侧边栏联动）
    this.initializeCore();

    // 设置面板
    this.addSettingTab(new EasyReadSettingTab(this.app, this));

    // 命令：打开侧边栏
    this.addCommand({
      id: "open-sidebar",
      name: "打开翻译侧边栏",
      callback: () => this.openSidebar(),
    });

    // 命令：全文翻译
    this.addCommand({
      id: "translate-full",
      name: "全文翻译",
      callback: () => this.handleFullTranslate(),
    });

    // 命令：划词翻译（快捷键 Ctrl+T）
    this.addCommand({
      id: "translate-selection",
      name: "翻译选中文本",
      hotkeys: [{ modifiers: ["Mod"], key: "t" }],
      callback: () => this.handleTranslateSelection(),
    });

    // 编辑器右键菜单
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu: Menu) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || !view.editor.getSelection()) return;

        menu.addItem((item) => {
          item
            .setTitle("EasyRead: 翻译选中文本")
            .setIcon("languages")
            .onClick(() => this.handleTranslateSelection());
        });
      })
    );

    // 鼠标松开 — 显示浮动翻译按钮（Markdown）
    this.registerDomEvent(document, "mouseup", (evt: MouseEvent) => {
      // 点击在浮动按钮上时不处理
      if (
        evt.target instanceof Element &&
        evt.target.closest(".easyread-float-btn")
      )
        return;

      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!view) return;

      const selection = view.editor.getSelection();
      if (selection && selection.trim().length > 0) {
        this.tooltip.showButton();
      } else {
        setTimeout(() => {
          if (!view.editor.getSelection()) {
            this.tooltip.hide();
          }
        }, 200);
      }
    });

    // Esc 隐藏浮动按钮
    this.registerDomEvent(document, "keydown", (evt: KeyboardEvent) => {
      if (evt.key === "Escape" && this.tooltip.isVisible()) {
        this.tooltip.hide();
      }
    });

    // 注入样式
    this.injectStyles();
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
    this.tooltip?.destroy();
  }

  async loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  // ─── Core init ───────────────────────────────────

  initializeCore(): void {
    this.tooltip?.destroy();

    const provider = new OpenAIAdapter(
      this.settings.openaiApiKey,
      this.settings.openaiBaseUrl,
      this.settings.openaiModel
    );
    this.translator = new Translator(provider);

    // 浮动按钮 → 填充侧边栏并自动翻译
    const onTranslate = async (
      text: string,
      _source: "markdown" | "pdf"
    ): Promise<void> => {
      const sidebar = await this.getSidebar();
      // translateText 会自动触发翻译（调用 sidebar 注册的 onTranslate 回调）
      await sidebar.translateText(
        text,
        this.settings.sourceLang,
        this.settings.targetLang
      );
    };

    this.tooltip = new TranslationTooltip(this.app, onTranslate);
    this.pdfOverlay = new PDFTooltipOverlay(this.app, this.tooltip, this);
  }

  // ─── Sidebar ────────────────────────────────────

  /**
   * 获取侧边栏视图实例，不存在则创建
   */
  private async getSidebar(): Promise<TranslationView> {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (leaves.length > 0) {
      const view = leaves[0].view as TranslationView;
      this.ensureSidebarCallbacks(view);
      return view;
    }
    // 创建新侧边栏
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) throw new Error("无法创建侧边栏");
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
    const view = leaf.view as TranslationView;
    this.ensureSidebarCallbacks(view);
    return view;
  }

  /**
   * 确保侧边栏已注册翻译回调
   */
  private ensureSidebarCallbacks(sidebar: TranslationView): void {
    // 加载持久化的历史记录
    this.loadData().then((data: Record<string, unknown> | null) => {
      const savedHistory = data?._history as HistoryEntry[] | undefined;
      if (savedHistory) {
        sidebar.loadHistory(savedHistory);
      }
    });

    sidebar.setCallbacks({
      onTranslate: async (
        text: string,
        sourceLang: string,
        targetLang: string
      ) => {
        sidebar.showLoading();
        try {
          const result = await this.translator.translate({
            text,
            sourceLang,
            targetLang,
          });
          sidebar.setTranslated(result.translatedText);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "翻译失败";
          sidebar.setError(msg);
          new Notice(msg);
        }
      },
      onLangChange: (sourceLang: string, targetLang: string) => {
        this.settings.sourceLang = sourceLang;
        this.settings.targetLang = targetLang;
        this.saveSettings();
      },
      onHistoryChange: (history: HistoryEntry[]) => {
        this.saveHistory(history);
      },
    });
  }

  private async saveHistory(history: HistoryEntry[]): Promise<void> {
    const data = (await this.loadData()) || {};
    data._history = history;
    await this.saveData(data);
  }

  /**
   * 打开侧边栏
   */
  private async openSidebar(): Promise<void> {
    await this.getSidebar();
  }

  // ─── Commands ───────────────────────────────────

  private handleTranslateSelection(): void {
    this.tooltip.translateNow();
  }

  private handleFullTranslate(): void {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      new Notice("请先打开一个 Markdown 文件");
      return;
    }

    new TranslationModal(this.app, file, async (options: TranslationOptions) => {
      try {
        await this.executeFullTranslate(file, options);
      } catch (err) {
        new Notice(`全文翻译失败: ${err instanceof Error ? err.message : "未知错误"}`);
      }
    }).open();
  }

  private async executeFullTranslate(
    file: TFile,
    options: TranslationOptions
  ): Promise<void> {
    const content = await this.app.vault.read(file);
    if (!content.trim()) {
      new Notice("当前文件为空");
      return;
    }

    new Notice("全文翻译中...");

    const chunker = new Chunker(this.settings.maxChunkTokens);
    const chunks = chunker.chunk(content);

    if (chunks.length === 0) {
      new Notice("没有可翻译的内容");
      return;
    }

    const queue = new RequestQueue(3);
    const translatedChunks = await Promise.all(
      chunks.map((chunk) =>
        queue.add({
          execute: async () => {
            const result = await this.translator.translate({
              text: chunk.text,
              sourceLang: options.sourceLang,
              targetLang: options.targetLang,
            });
            return {
              index: chunk.index,
              originalText: chunk.text,
              translatedText: result.translatedText,
            };
          },
          retries: 2,
        })
      )
    );

    const fullTranslation = chunker.reconstruct(translatedChunks);

    if (options.outputMode === "overwrite") {
      await this.app.vault.modify(file, fullTranslation);
      new Notice("全文翻译完成（已覆盖原文）");
    } else {
      const newName =
        file.basename + `-${options.targetLang}` + "." + file.extension;
      await this.app.vault.create(newName, fullTranslation);
      new Notice(`全文翻译完成 → ${newName}`);
    }
  }

  // ─── Styles ─────────────────────────────────────

  private injectStyles(): void {
    const style = document.createElement("style");
    style.id = "easyread-styles";
    style.textContent = `
      /* 浮动翻译按钮 */
      .easyread-float-btn {
        position: fixed;
        z-index: 9999;
        pointer-events: none;
      }
      .easyread-float-btn-hidden { display: none; }
      .easyread-float-btn-inner {
        pointer-events: auto;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
        border-radius: 6px;
        padding: 4px 12px;
        font-size: 13px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      .easyread-float-btn-inner:hover {
        background: var(--interactive-accent-hover);
      }

      /* 侧边栏 — 新版布局 */
      .easyread-sidebar {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .easyread-sidebar-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .easyread-sidebar-title {
        margin: 0;
        font-size: 16px;
      }
      .easyread-sidebar-lang-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .easyread-sidebar-select {
        flex: 1;
        font-size: 13px;
        padding: 2px 4px;
        border-radius: 4px;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-primary);
        color: var(--text-normal);
      }
      .easyread-sidebar-icon-btn {
        background: var(--interactive-normal);
        border: none;
        border-radius: 4px;
        padding: 2px 8px;
        font-size: 16px;
        cursor: pointer;
        line-height: 1;
        color: var(--text-muted);
      }
      .easyread-sidebar-icon-btn:hover {
        background: var(--interactive-hover);
        color: var(--text-normal);
      }
      .easyread-sidebar-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-muted);
        margin-top: 4px;
      }
      .easyread-sidebar-textarea {
        width: 100%;
        font-size: 13px;
        line-height: 1.5;
        padding: 6px 8px;
        border-radius: 4px;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-primary);
        color: var(--text-normal);
        resize: vertical;
        font-family: inherit;
        box-sizing: border-box;
      }
      .easyread-sidebar-textarea:focus {
        border-color: var(--interactive-accent);
        outline: none;
      }
      .easyread-sidebar-textarea-translated {
        background: var(--background-secondary);
      }
      .easyread-sidebar-action-row {
        display: flex;
        gap: 6px;
      }
      .easyread-sidebar-btn {
        background: var(--interactive-normal);
        border: none;
        border-radius: 4px;
        padding: 4px 12px;
        font-size: 13px;
        cursor: pointer;
        color: var(--text-normal);
      }
      .easyread-sidebar-btn:hover {
        background: var(--interactive-hover);
      }
      .easyread-sidebar-btn:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .easyread-sidebar-btn-primary {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }
      .easyread-sidebar-btn-primary:hover:not(:disabled) {
        background: var(--interactive-accent-hover);
      }

      /* 历史记录 */
      .easyread-sidebar-history {
        border-top: 1px solid var(--background-modifier-border);
        margin-top: 4px;
      }
      .easyread-sidebar-history-header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 0;
        cursor: pointer;
        user-select: none;
        font-size: 13px;
      }
      .easyread-sidebar-history-toggle {
        font-weight: 600;
        color: var(--text-muted);
      }
      .easyread-sidebar-history-badge {
        color: var(--text-faint);
        font-size: 12px;
      }
      .easyread-sidebar-history-body {
        max-height: 300px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 4px;
        transition: max-height 0.2s ease;
      }
      .easyread-sidebar-history-collapsed {
        max-height: 0;
        overflow: hidden;
      }
      .easyread-sidebar-history-empty {
        color: var(--text-faint);
        font-size: 12px;
        padding: 8px 0;
      }
      .easyread-sidebar-history-item {
        padding: 6px 8px;
        border-radius: 4px;
        cursor: pointer;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
      }
      .easyread-sidebar-history-item:hover {
        background: var(--background-modifier-hover);
      }
      .easyread-sidebar-history-original {
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 2px;
        word-break: break-word;
      }
      .easyread-sidebar-history-translated {
        font-size: 13px;
        color: var(--text-normal);
        margin-bottom: 2px;
        word-break: break-word;
      }
      .easyread-sidebar-history-meta {
        font-size: 11px;
        color: var(--text-faint);
      }
    `;
    document.head.appendChild(style);
  }
}

// ─── Settings tab ────────────────────────────────

class EasyReadSettingTab extends PluginSettingTab {
  plugin: EasyReadPlugin;

  constructor(app: App, plugin: EasyReadPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "EasyRead — LLM 翻译设置" });

    new Setting(containerEl)
      .setName("API Key")
      .setDesc("你的 LLM API 密钥")
      .addText((text) =>
        text
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.openaiApiKey)
          .onChange(async (value) => {
            this.plugin.settings.openaiApiKey = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("API Base URL")
      .setDesc("兼容 OpenAI 协议的 API 地址（如 https://api.openai.com/v1）")
      .addText((text) =>
        text
          .setPlaceholder("https://api.openai.com/v1")
          .setValue(this.plugin.settings.openaiBaseUrl)
          .onChange(async (value) => {
            this.plugin.settings.openaiBaseUrl = value || "https://api.openai.com/v1";
            await this.plugin.saveSettings();
            this.plugin.initializeCore();
          })
      );

    new Setting(containerEl)
      .setName("模型")
      .setDesc("使用的模型名称")
      .addText((text) =>
        text
          .setPlaceholder("gpt-4o-mini")
          .setValue(this.plugin.settings.openaiModel)
          .onChange(async (value) => {
            this.plugin.settings.openaiModel = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("目标语言")
      .setDesc("翻译的目标语言")
      .addText((text) =>
        text
          .setPlaceholder("中文")
          .setValue(this.plugin.settings.targetLang)
          .onChange(async (value) => {
            this.plugin.settings.targetLang = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("源语言")
      .setDesc("源语言（auto 表示自动检测）")
      .addText((text) =>
        text
          .setPlaceholder("auto")
          .setValue(this.plugin.settings.sourceLang)
          .onChange(async (value) => {
            this.plugin.settings.sourceLang = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
