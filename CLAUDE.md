# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EasyRead — LLM-powered translation plugin for Obsidian. Selection translation (Markdown + PDF), full-document translation, sidebar history.

- **Language**: TypeScript (strict mode, ES2020 target)
- **Build**: esbuild (dev watch + production minified)
- **Test**: Vitest + jsdom
- **Status**: MVP complete — only OpenAI-compatible APIs supported. The full settings UI is inlined in `main.ts`.

## Build & Test Commands

```bash
npm run dev          # Development watch (esbuild + inline sourcemap)
npm run build        # Production build (minified + tree-shaken)
npm run lint         # TypeScript type check: tsc --noEmit
npm test             # Run all Vitest tests (46 tests across 3 suites)
npm run test:watch   # Watch mode
```

Single test file: `npx vitest run src/providers/OpenAIAdapter.test.ts`

## Architecture

```
main.ts                  # Plugin entry — registers views, commands, settings tab
├── ui/
│   ├── TranslationTooltip.ts    # Floating translate button on text selection
│   ├── PDFTooltipOverlay.ts     # PDF selection → tooltip bridge
│   ├── TranslationModal.ts      # Full-doc translation dialog
│   └── TranslationView.ts       # Sidebar panel (bilingual view + history)
├── core/
│   ├── translator/
│   │   ├── Translator.ts        # Orchestrates Provider + Chunker
│   │   ├── Chunker.ts           # Splits text by heading → paragraph → sentence
│   │   └── types.ts             # Request/response types, chunk types
│   └── pdf/
│       └── PDFParser.ts         # PDF text extraction and hyphenation cleanup
├── providers/
│   ├── interface.ts             # LLMProvider abstract interface
│   ├── index.ts                 # Provider registry (currently only "openai")
│   └── OpenAIAdapter.ts         # OpenAI-compatible API via fetch + SSE streaming
├── settings/
│   ├── types.ts                 # EasyReadSettings interface
│   └── defaults.ts              # DEFAULT_SETTINGS constant
└── utils/
    ├── debounce.ts              # Debounce / DebounceAsync utilities
    └── requestQueue.ts          # Concurrent request queue with retry
```

### Key design principles followed in this codebase

- **Dependency injection**: Core classes (Translator, Chunker) receive dependencies via constructor, never reference Obsidian globals directly.
- **Side-effect isolation**: Obsidian API calls (`this.app`) are confined to `main.ts` and `ui/`. The `core/` and `providers/` layers are pure logic.
- **Single file = single class**: One class per file, files named after the class (PascalCase).
- **Tests alongside source**: `<ClassName>.test.ts` next to the source file, Vitest + jsdom.

## Code Conventions

| Rule | Convention |
|------|-----------|
| Naming | Classes/interfaces: PascalCase. Functions/variables: camelCase. Constants: UPPER_SNAKE |
| Async | `async/await` only, no bare `.then()` |
| Exports | Default export for the main class, named exports for types |
| Errors | All external calls wrapped in try-catch, descriptive Chinese error messages for user-facing errors |
| Comments | JSDoc on all public methods; inline comments on non-obvious logic |

## Translation Flow

1. User selects text → `TranslationTooltip` appears (or `Ctrl+T` / right-click menu)
2. `main.ts` connects tooltip/command → `TranslationView.translateText()`
3. View calls `Translator.translate()` (core) → `LLMProvider.translate()` (provider)
4. Result flows back: `TranslateResponse` → `TranslationView.setTranslated()` → user sees it

For full-doc translation:
1. `TranslationModal` collects options (source/target lang, overwrite vs new file)
2. `app.vault.read()` → `Chunker.chunk()` → `RequestQueue` (concurrency=3, max retries=2) → `Chunker.reconstruct()` → `app.vault.write()`

## Test Suites (46 total)

- **OpenAIAdapter.test.ts** (17 tests): translate(), translateStream(), estimateTokens() — mocks fetch
- **Chunker.test.ts** (14 tests): heading/paragraph/sentence splitting, overlap, YAML frontmatter skip, reconstruct()
- **PDFParser.test.ts** (15 tests): cleanText() (hyphenation, zero-width chars, BOM, whitespace), isPDFView(), getSelectionText()

## What Doesn't Exist Yet

The following are **not yet implemented** despite being referenced in older docs:
- No multi-provider adapters (only OpenAI)
- No SettingsTab separate file (settings UI is embedded in `main.ts`)
- No CacheManager, PromptManager, GlossaryEngine
- No tokenEstimator, logger
- No integration or E2E tests

## Progress Tracking

Every time code is changed, **update `PROGRESS.md`** to record what was done. This ensures future agents can pick up where previous work left off.

### How to update

1. **New feature / new module** → add a new Task section under the current phase with status 🔄 → ✅
2. **Bug fix / refactor** → append a row to the **变更记录** table
3. **Removing or renaming a file** → update the **当前文件清单** section

### Change log format

```
| 日期 | Agent | 文件 | 操作 | 摘要 |
|------|-------|------|------|------|
| 2026-06-02 | agent-xyz | src/providers/AnthropicAdapter.ts | create | Anthropic API 适配器实现 |
| 2026-06-02 | agent-xyz | src/main.ts | edit | 注册 Anthropic provider 选项 |
```

### Task status markers

| Marker | Meaning |
|--------|---------|
| ⬜ 待开始 | Not started, dependencies not met |
| 🔄 进行中 | Currently being worked on |
| ✅ 完成 | Exit criteria met |
| ❌ 阻塞 | Blocked by external dependency |
