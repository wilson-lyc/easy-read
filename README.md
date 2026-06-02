<h1 align="center">EasyRead</h1>

<p align="center">
  <b>LLM-powered Translation Plugin for Obsidian</b><br>
  Selection Translation (Markdown / PDF) · Full-doc Translation · Sidebar Translation
</p>

<p align="center">
  <a href="https://github.com/wilson-lyc/easy-read/releases">
    <img src="https://img.shields.io/github/v/release/wilson-lyc/easy-read?style=flat-square" alt="GitHub release">
  </a>
  <img src="https://img.shields.io/badge/Obsidian-Plugin-7C3AED?style=flat-square" alt="Obsidian plugin">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License">
</p>

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

## License

MIT
