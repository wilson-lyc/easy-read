<p align="center">
  <img src="https://raw.githubusercontent.com/wilson-lyc/easy-read/main/assets/icon.png" alt="EasyRead" width="128" height="128">
</p>

<h1 align="center">EasyRead</h1>

<p align="center">
  <b>基于 LLM 的 Obsidian 翻译插件</b><br>
  划词翻译（Markdown / PDF）· 全文翻译 · 侧边栏翻译
</p>

<p align="center">
  <a href="https://github.com/wilson-lyc/easy-read/releases">
    <img src="https://img.shields.io/github/v/release/wilson-lyc/easy-read?style=flat-square" alt="GitHub release">
  </a>
  <img src="https://img.shields.io/badge/Obsidian-Plugin-7C3AED?style=flat-square" alt="Obsidian plugin">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License">
</p>

---

[English](#english) | [中文](#中文)

---

<a name="english"></a>

# EasyRead

**EasyRead** is an Obsidian plugin that brings LLM-powered translation directly into your note-taking workflow. It supports selection translation (both Markdown and PDF) and full-document translation, all within Obsidian — no more switching between apps.

## Features

- **Selection Translation (Markdown)** — Select text in your notes and press `Ctrl+T` or click the floating translate button to get an instant translation in the sidebar.
- **Selection Translation (PDF)** — Select text in Obsidian's built-in PDF viewer. Same keyboard shortcut and floating button work seamlessly.
- **Full-document Translation** — Translate entire Markdown notes with one command. Supports overwriting the original or creating a new file.
- **Sidebar Translation Panel** — Dedicated sidebar with original/translated text areas, language selection, translation history, and copy support.
- **Multi-LLM Support** — Works with any OpenAI-compatible API (OpenAI, Azure OpenAI, Ollama, One API, LiteLLM, etc.).
- **Translation History** — All translations are saved locally, viewable and searchable in the sidebar.
- **Privacy-first** — Use with local LLMs (Ollama) for fully offline translation.

## Installation

### 🏪 Obsidian Community Store (Recommended)

1. Open Obsidian **Settings** → **Community plugins**
2. Turn off **Restricted mode**
3. Click **Browse** and search for **"EasyRead"**
4. Click **Install** → **Enable**

> ⏳ Submitted to community store — awaiting review. Install via BRAT in the meantime.

### 📦 Manual Installation

1. Download the latest `main.js` and `manifest.json` from the [Releases page](https://github.com/wilson-lyc/easy-read/releases)
2. Copy both files into `<your-vault>/.obsidian/plugins/easy-read/`
3. Open Obsidian **Settings** → **Community plugins** → enable **EasyRead**

### 🧪 BRAT Installation (Beta)

1. Install the [BRAT](obsidian://show-plugin?id=obsidian-42-brat) plugin
2. `Ctrl+P` → `BRAT: Add a beta plugin`
3. Enter `https://github.com/wilson-lyc/easy-read`
4. Enable **EasyRead** in Community plugins

## Quick Start

1. Open **Settings** → **EasyRead**
2. Enter your **API Key** and **Base URL** (default: `https://api.openai.com/v1`)
3. Select your preferred **Model** (default: `gpt-4o-mini`)
4. Choose your **Target Language** (default: `中文`)

### Usage

| Action | Method |
|--------|--------|
| **Translate selected text** | Select text → click floating **翻译** button, or press `Ctrl+T` |
| **Translate PDF text** | Select text in PDF → click floating **翻译** button |
| **Translate full note** | `Ctrl+P` → `EasyRead: 全文翻译` |
| **Open sidebar** | `Ctrl+P` → `EasyRead: 打开翻译侧边栏` |
| **Open settings** | Click ⚙ in sidebar title, or go to Settings → EasyRead |
| **Browse history** | Click **▼ 历史记录** in sidebar to expand, click any entry to reload |

### Sidebar Layout

```
┌───────────────────────────────┐
│ 侧边翻译                   ⚙  │
├───────────────────────────────┤
│ [auto ▼]  ⇄  [中文 ▼]        │
├───────────────────────────────┤
│ 原文 [textarea]               │
│ [翻译]                         │
│ 译文 [textarea]               │
│ [复制译文]                     │
├───────────────────────────────┤
│ ▼ 历史记录 (5)        [清空]   │
│ ┌───────────────────────────┐ │
│ │ Previous translations...  │ │
│ └───────────────────────────┘ │
└───────────────────────────────┘
```

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| **API Key** | Your LLM API key | — |
| **API Base URL** | API endpoint (OpenAI-compatible) | `https://api.openai.com/v1` |
| **Model** | Model name | `gpt-4o-mini` |
| **Target Language** | Translation target language | `中文` |
| **Source Language** | Source language (`auto` for auto-detect) | `auto` |

### Supported Providers

| Provider | Base URL |
|----------|----------|
| OpenAI | `https://api.openai.com/v1` |
| Azure OpenAI | `https://<name>.openai.azure.com/v1` |
| Ollama (local) | `http://localhost:11434/v1` |
| One API / LiteLLM | Custom URL |

## Development

```bash
# Clone
git clone https://github.com/wilson-lyc/easy-read.git
cd easy-read

# Install dependencies
npm install

# Development mode (watch)
npm run dev

# Production build
npm run build

# Type check
npx tsc --noEmit

# Run tests
npm test
```

### Project Structure

```
src/
├── main.ts                     # Plugin entry point
├── settings/                   # Settings types & defaults
├── providers/                  # LLM provider interface & adapters
│   ├── interface.ts
│   └── OpenAIAdapter.ts
├── core/
│   ├── translator/             # Translator engine, Chunker
│   └── pdf/                    # PDF text extraction & cleaning
├── ui/
│   ├── TranslationView.ts      # Sidebar panel
│   ├── TranslationTooltip.ts   # Floating translate button
│   ├── PDFTooltipOverlay.ts    # PDF selection handler
│   └── TranslationModal.ts     # Full-doc translation dialog
└── utils/                      # Debounce, RequestQueue, etc.
```

## Roadmap

| Phase | Status | Features |
|-------|--------|----------|
| **P0: MVP** | ✅ Complete | Selection translation (MD + PDF), full-doc translation, sidebar, OpenAI/API-compatible providers |
| **P1: Experience** | 🔜 Planned | Multi-provider switching, bilingual view, Markdown preservation, improved caching |
| **P2: Ecosystem** | — | Batch translation, custom glossary, i18n, performance optimization |
| **P3: Community** | — | OCR translation, custom providers, Templater/Dataview integration |

## Submitting to Obsidian Community Store

This plugin is ready for community submission. To submit:

1. Push code to a public GitHub repository
2. Create a GitHub Release with version tag (e.g., `0.1.0`)
3. Fork [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases)
4. Add `easy-read` to `community-plugins.json`:
   ```json
   {
     "id": "easy-read",
     "name": "EasyRead",
     "author": "wilson-lyc",
     "description": "基于 LLM 的翻译插件，支持划词翻译（Markdown/PDF）和全文翻译",
     "repo": "wilson-lyc/easy-read"
   }
   ```
5. Submit a Pull Request

The `versions.json` file is already included in this project.

## License

MIT

---

<a name="中文"></a>

# EasyRead

**EasyRead** 是一款基于大语言模型（LLM）的 Obsidian 翻译插件，在笔记工作流中无缝集成翻译能力。支持 Markdown 和 PDF 划词翻译、全文翻译，所有结果统一展示在侧边栏。

## 功能

- **划词翻译（Markdown）** — 选中文本后点击浮动按钮或按 `Ctrl+T`，翻译结果即时显示在侧边栏
- **划词翻译（PDF）** — 在 Obsidian 内置 PDF 阅读器中选中文字，同样支持浮动按钮和快捷键
- **全文翻译** — 一键翻译整篇 Markdown 笔记，支持覆盖原文或新建笔记
- **侧边栏翻译面板** — 原文/译文对照、语言切换、翻译历史、复制译文
- **多 LLM 支持** — 兼容任何 OpenAI 协议的 API（OpenAI、Azure、Ollama、One API 等）
- **翻译历史** — 所有翻译自动保存，侧边栏可折叠浏览，点击回看
- **隐私优先** — 搭配本地 Ollama 使用可实现完全离线翻译

## 安装

### 🏪 Obsidian 社区商店（推荐）

1. 打开 Obsidian **设置** → **社区插件**
2. 关闭 **安全模式**
3. 点击 **浏览**，搜索 **"EasyRead"**
4. 点击 **安装** → **启用**

> ⏳ 已提交社区商店审核，审核期间可通过 BRAT 安装。

### 📦 手动安装

1. 从 [Releases 页面](https://github.com/wilson-lyc/easy-read/releases) 下载最新的 `main.js` 和 `manifest.json`
2. 复制到 `<你的库>/.obsidian/plugins/easy-read/`
3. 打开 Obsidian **设置** → **社区插件** → 启用 **EasyRead**

### 🧠 BRAT 安装（Beta 版）

1. 安装 [BRAT](obsidian://show-plugin?id=obsidian-42-brat) 插件
2. `Ctrl+P` → `BRAT: Add a beta plugin`
3. 输入 `https://github.com/wilson-lyc/easy-read`
4. 在社区插件中启用 **EasyRead**

## 快速开始

1. 打开 **设置** → **EasyRead**
2. 填写 **API Key** 和 **API Base URL**（默认 `https://api.openai.com/v1`）
3. 选择 **模型**（默认 `gpt-4o-mini`）
4. 设置 **目标语言**（默认 `中文`）

### 使用方法

| 操作 | 方式 |
|------|------|
| **翻译选中文本** | 选中 → 点击浮动 **翻译** 按钮，或按 `Ctrl+T` |
| **翻译 PDF 文字** | 在 PDF 中选中文字 → 点击浮动 **翻译** 按钮 |
| **全文翻译** | `Ctrl+P` → `EasyRead: 全文翻译` |
| **打开侧边栏** | `Ctrl+P` → `EasyRead: 打开翻译侧边栏` |
| **打开设置** | 点击侧边栏标题行的 ⚙ 按钮，或 设置 → EasyRead |
| **浏览历史** | 点击侧边栏的 **▼ 历史记录** 展开，点击条目回看 |

## 配置说明

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| **API Key** | 你的 LLM API 密钥 | — |
| **API Base URL** | API 地址（兼容 OpenAI 协议） | `https://api.openai.com/v1` |
| **模型** | 使用的模型名 | `gpt-4o-mini` |
| **目标语言** | 翻译目标语言 | `中文` |
| **源语言** | 源语言（`auto` 为自动检测） | `auto` |

### 支持的 LLM 服务

| 服务 | Base URL |
|------|----------|
| OpenAI | `https://api.openai.com/v1` |
| Azure OpenAI | `https://<名>.openai.azure.com/v1` |
| Ollama（本地） | `http://localhost:11434/v1` |
| One API / LiteLLM | 自定义地址 |

## 开发

```bash
# 克隆
git clone https://github.com/wilson-lyc/easy-read.git
cd easy-read

# 安装依赖
npm install

# 开发模式（监听文件变化自动构建）
npm run dev

# 生产构建
npm run build

# 类型检查
npx tsc --noEmit

# 运行测试
npm test
```

## 提交到 Obsidian 社区商店

本插件已准备好提交社区商店。提交流程：

1. 将代码推送到公开 GitHub 仓库
2. 创建 GitHub Release，版本号 `0.1.0`
3. Fork [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases)
4. 在 `community-plugins.json` 中添加：
   ```json
   {
     "id": "easy-read",
     "name": "EasyRead",
     "author": "wilson-lyc",
     "description": "基于 LLM 的 Obsidian 翻译插件，支持划词翻译（Markdown/PDF）和全文翻译",
     "repo": "wilson-lyc/easy-read"
   }
   ```
5. 提交 Pull Request

`versions.json` 已包含在项目中。

## 许可证

MIT
