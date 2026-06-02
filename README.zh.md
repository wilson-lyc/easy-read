<p align="center">
  <a href="https://github.com/wilson-lyc/easy-read/releases">
    <img src="https://img.shields.io/github/v/release/wilson-lyc/easy-read?style=flat-square" alt="GitHub release">
  </a>
  <img src="https://img.shields.io/badge/Obsidian-Plugin-7C3AED?style=flat-square" alt="Obsidian plugin">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License">
</p>

<h1 align="center">EasyRead</h1>

<p align="center">
  <b>基于 LLM 的 Obsidian 翻译插件</b><br>
  划词翻译（Markdown / PDF）· 全文翻译 · 侧边栏翻译
</p>

---

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

## 许可证

MIT
