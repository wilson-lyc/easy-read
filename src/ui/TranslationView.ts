import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE = "easyread-translation";

/** 历史记录条目 */
export interface HistoryEntry {
  original: string;
  translated: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

/** 预设语言选项 */
const LANGUAGES = [
  { value: "auto", label: "自动检测" },
  { value: "中文", label: "中文" },
  { value: "English", label: "English" },
  { value: "日本語", label: "日本語" },
  { value: "한국어", label: "한국어" },
  { value: "Français", label: "Français" },
  { value: "Deutsch", label: "Deutsch" },
  { value: "Español", label: "Español" },
  { value: "Русский", label: "Русский" },
  { value: "العربية", label: "العربية" },
  { value: "Português", label: "Português" },
  { value: "Italiano", label: "Italiano" },
];

const MAX_HISTORY = 50;

/**
 * EasyRead 翻译侧边栏（含历史记录）
 *
 * 上部：当前翻译（原文/译文 textarea + 翻译按钮）
 * 下部：可折叠的历史记录列表，点击条目加载到上部
 */
export default class TranslationView extends ItemView {
  // DOM 元素
  private sourceLangSelect!: HTMLSelectElement;
  private targetLangSelect!: HTMLSelectElement;
  private originalTextarea!: HTMLTextAreaElement;
  private translatedTextarea!: HTMLTextAreaElement;
  private translateBtn!: HTMLButtonElement;
  private copyBtn!: HTMLButtonElement;
  private historyContainer!: HTMLElement;
  private historyToggle!: HTMLElement;
  private historyBody!: HTMLElement;
  private historyBadge!: HTMLElement;

  // 数据
  private history: HistoryEntry[] = [];
  private nextLoadOriginal: string | null = null;

  // 回调
  private onTranslate:
    | ((text: string, sourceLang: string, targetLang: string) => Promise<void>)
    | null = null;
  private onLangChange:
    | ((sourceLang: string, targetLang: string) => void)
    | null = null;
  private onHistoryChange:
    | ((history: HistoryEntry[]) => void)
    | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  getDisplayText(): string {
    return "侧边翻译";
  }

  getIcon(): string {
    return "languages";
  }

  setCallbacks(opts: {
    onTranslate: (text: string, sourceLang: string, targetLang: string) => Promise<void>;
    onLangChange: (sourceLang: string, targetLang: string) => void;
    onHistoryChange: (history: HistoryEntry[]) => void;
  }): void {
    this.onTranslate = opts.onTranslate;
    this.onLangChange = opts.onLangChange;
    this.onHistoryChange = opts.onHistoryChange;
  }

  // ── 公开 API ────────────────────────────────────

  /** 设置原文并自动翻译 */
  async translateText(text: string, sourceLang?: string, targetLang?: string): Promise<void> {
    this.originalTextarea.value = text;
    if (sourceLang) this.sourceLangSelect.value = sourceLang;
    if (targetLang) this.targetLangSelect.value = targetLang;
    // 标记：等翻译完成后才存历史（不存当前这次）
    this.nextLoadOriginal = text;
    await this.doTranslate();
  }

  /** main.ts 在翻译完成后调用，填入译文并保存历史 */
  setTranslated(text: string): void {
    this.translatedTextarea.value = text;
    this.clearLoading();

    // 保存历史（仅当本次翻译是新内容）
    if (this.nextLoadOriginal && this.nextLoadOriginal === this.originalTextarea.value.trim()) {
      this.addToHistory(this.originalTextarea.value.trim(), text);
      this.nextLoadOriginal = null;
    } else if (this.nextLoadOriginal === null && this.originalTextarea.value.trim() && text) {
      // 手动点击翻译按钮触发的也保存
      this.addToHistory(this.originalTextarea.value.trim(), text);
    }
    this.nextLoadOriginal = null;
  }

  setError(msg: string): void {
    this.showError(msg);
    this.clearLoading();
  }

  /** 加载持久化的历史数据 */
  loadHistory(entries: HistoryEntry[]): void {
    this.history = entries;
    this.renderHistory();
  }

  getSourceLang(): string { return this.sourceLangSelect.value; }
  getTargetLang(): string { return this.targetLangSelect.value; }

  setSourceLang(lang: string): void {
    if (LANGUAGES.some((o) => o.value === lang)) this.sourceLangSelect.value = lang;
  }
  setTargetLang(lang: string): void {
    if (LANGUAGES.some((o) => o.value === lang)) this.targetLangSelect.value = lang;
  }

  // ── 加载 / 加载状态 ─────────────────────────────

  showLoading(): void {
    this.translatedTextarea.value = "翻译中...";
    this.translateBtn.setText("翻译中...");
    this.translateBtn.disabled = true;
  }

  clearLoading(): void {
    this.translateBtn.setText("翻译");
    this.translateBtn.disabled = false;
  }

  showError(msg: string): void {
    this.translatedTextarea.value = `❌ ${msg}`;
  }

  // ── Obsidian 生命周期 ───────────────────────────

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("easyread-sidebar");

    // === 标题 ===
    const titleRow = container.createDiv({ cls: "easyread-sidebar-title-row" });
    titleRow.createEl("h3", { text: "侧边翻译", cls: "easyread-sidebar-title" });
    const settingsBtn = titleRow.createEl("button", {
      cls: "easyread-sidebar-icon-btn",
      text: "⚙",
    });
    settingsBtn.title = "打开 EasyRead 设置";
    settingsBtn.addEventListener("click", () => {
      // @ts-expect-error Obsidian API
      this.app.setting.openTabById("easy-read");
    });

    // === 语言行 ===
    const langRow = container.createDiv({ cls: "easyread-sidebar-lang-row" });
    this.sourceLangSelect = langRow.createEl("select", { cls: "easyread-sidebar-select" });
    this.populateOptions(this.sourceLangSelect, "auto");

    const swapBtn = langRow.createEl("button", { cls: "easyread-sidebar-icon-btn", text: "⇄" });
    swapBtn.title = "互换源语言和目标语言";

    this.targetLangSelect = langRow.createEl("select", { cls: "easyread-sidebar-select" });
    this.populateOptions(this.targetLangSelect, "中文");

    swapBtn.addEventListener("click", () => {
      const tmp = this.sourceLangSelect.value;
      this.sourceLangSelect.value = this.targetLangSelect.value;
      this.targetLangSelect.value = tmp;
      this.notifyLangChange();
    });
    this.sourceLangSelect.addEventListener("change", () => this.notifyLangChange());
    this.targetLangSelect.addEventListener("change", () => this.notifyLangChange());

    // === 原文 ===
    container.createEl("label", { text: "原文", cls: "easyread-sidebar-label" });
    this.originalTextarea = container.createEl("textarea", { cls: "easyread-sidebar-textarea" });
    this.originalTextarea.placeholder = "在此输入或选中文本后点击翻译...";
    this.originalTextarea.rows = 5;

    // === 操作按钮行 ===
    const actionRow = container.createDiv({ cls: "easyread-sidebar-action-row" });
    this.translateBtn = actionRow.createEl("button", {
      cls: "easyread-sidebar-btn easyread-sidebar-btn-primary",
      text: "翻译",
    });
    this.translateBtn.addEventListener("click", () => {
      this.nextLoadOriginal = null; // 手动点击是正常翻译，允许存历史
      this.doTranslate();
    });

    // === 译文 ===
    container.createEl("label", { text: "译文", cls: "easyread-sidebar-label" });
    this.translatedTextarea = container.createEl("textarea", {
      cls: "easyread-sidebar-textarea easyread-sidebar-textarea-translated",
    });
    this.translatedTextarea.placeholder = "翻译结果将显示在此处...";
    this.translatedTextarea.rows = 6;
    this.translatedTextarea.readOnly = true;

    const bottomRow = container.createDiv({ cls: "easyread-sidebar-action-row" });
    this.copyBtn = bottomRow.createEl("button", { cls: "easyread-sidebar-btn", text: "复制译文" });
    this.copyBtn.addEventListener("click", () => this.copyTranslated());

    // === 历史记录（可折叠） ===
    this.historyContainer = container.createDiv({ cls: "easyread-sidebar-history" });

    const headerRow = this.historyContainer.createDiv({ cls: "easyread-sidebar-history-header" });
    this.historyToggle = headerRow.createEl("span", { cls: "easyread-sidebar-history-toggle" });
    this.historyToggle.setText("▶ 历史记录");
    this.historyBadge = headerRow.createEl("span", { cls: "easyread-sidebar-history-badge" });

    const clearHistoryBtn = headerRow.createEl("button", { cls: "easyread-sidebar-btn", text: "清空" });
    clearHistoryBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.clearHistory();
    });

    this.historyBody = this.historyContainer.createDiv({ cls: "easyread-sidebar-history-body" });
    this.historyBody.addClass("easyread-sidebar-history-collapsed");

    // 点击标题展开/折叠
    headerRow.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("button")) return;
      this.toggleHistory();
    });

    // 初始渲染空历史
    this.renderHistory();
  }

  // ── 历史记录管理 ────────────────────────────────

  private addToHistory(original: string, translated: string): void {
    // 不存重复项（与最近一条相同）
    if (this.history.length > 0) {
      const last = this.history[0];
      if (last.original === original && last.translated === translated) return;
    }

    this.history.unshift({
      original,
      translated,
      sourceLang: this.sourceLangSelect.value,
      targetLang: this.targetLangSelect.value,
      timestamp: Date.now(),
    });

    // 裁减上限
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(0, MAX_HISTORY);
    }

    this.renderHistory();
    this.notifyHistoryChange();
  }

  private loadEntry(entry: HistoryEntry): void {
    this.originalTextarea.value = entry.original;
    this.translatedTextarea.value = entry.translated;
    this.sourceLangSelect.value = entry.sourceLang;
    this.targetLangSelect.value = entry.targetLang;
    this.nextLoadOriginal = null; // 从历史加载不重复存历史
  }

  private clearHistory(): void {
    this.history = [];
    this.renderHistory();
    this.notifyHistoryChange();
  }

  private toggleHistory(): void {
    const isCollapsed = this.historyBody.hasClass("easyread-sidebar-history-collapsed");
    if (isCollapsed) {
      this.historyBody.removeClass("easyread-sidebar-history-collapsed");
      this.historyToggle.setText("▼ 历史记录");
    } else {
      this.historyBody.addClass("easyread-sidebar-history-collapsed");
      this.historyToggle.setText("▶ 历史记录");
    }
  }

  private renderHistory(): void {
    if (!this.historyBody) return;

    this.historyBody.empty();
    this.historyBadge.setText(`(${this.history.length})`);

    if (this.history.length === 0) {
      this.historyBody.createDiv({
        cls: "easyread-sidebar-history-empty",
        text: "暂无翻译记录",
      });
      return;
    }

    for (const entry of this.history) {
      const item = this.historyBody.createDiv({ cls: "easyread-sidebar-history-item" });
      item.addEventListener("click", () => this.loadEntry(entry));

      item.createDiv({
        cls: "easyread-sidebar-history-original",
        text: this.truncate(entry.original, 120),
      });
      item.createDiv({
        cls: "easyread-sidebar-history-translated",
        text: this.truncate(entry.translated, 120),
      });
      item.createDiv({
        cls: "easyread-sidebar-history-meta",
        text: `${entry.sourceLang} → ${entry.targetLang}  ${this.formatTime(entry.timestamp)}`,
      });
    }
  }

  private notifyHistoryChange(): void {
    this.onHistoryChange?.(this.history);
  }

  // ── 内部工具 ────────────────────────────────────

  private async doTranslate(): Promise<void> {
    const text = this.originalTextarea.value.trim();
    if (!text || !this.onTranslate) return;

    this.showLoading();
    try {
      await this.onTranslate(text, this.sourceLangSelect.value, this.targetLangSelect.value);
    } catch {
      // 错误已在回调中处理
    }
  }

  private async copyTranslated(): Promise<void> {
    const text = this.translatedTextarea.value;
    if (!text || text.startsWith("翻译中") || text.startsWith("❌")) return;
    await navigator.clipboard.writeText(text);
    this.copyBtn.setText("已复制");
    setTimeout(() => (this.copyBtn.textContent = "复制译文"), 2000);
  }

  private notifyLangChange(): void {
    this.onLangChange?.(this.sourceLangSelect.value, this.targetLangSelect.value);
  }

  private populateOptions(select: HTMLSelectElement, selected: string): void {
    for (const lang of LANGUAGES) {
      const opt = select.createEl("option", { value: lang.value, text: lang.label });
      if (lang.value === selected) opt.selected = true;
    }
  }

  private truncate(text: string, maxLen: number): string {
    return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
  }

  private formatTime(ts: number): string {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }
}
