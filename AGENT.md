# EasyRead — Agent 开发规范

本文档是本项目的**Agent 操作手册**。每个 Agent 在开始工作前必须先读取本文档，了解项目约定、开发流程和进度跟踪方式。

---

## 1. 项目速览

```
EasyRead — 基于 LLM 的 Obsidian 翻译插件
├── 核心能力：划词翻译（Markdown + PDF）+ 全文翻译
├── 语言：TypeScript
├── 构建：esbuild
└── 发布：Obsidian 社区插件（GitHub Release + BRAT）
```

关键文档（`docs/`）：

| 文档 | 用途 | Agent 必读时机 |
|------|------|---------------|
| `01-产品概要设计.md` | 功能需求、用户流程、非功能需求 | 阶段性回顾时 |
| `02-技术架构设计.md` | 模块架构、接口定义、数据流、文件结构 | 每次实现新模块前 |
| `03-开发路线图.md` | 任务依赖、阶段划分、出口条件 | **每次开始工作时** |
| `AGENT.md`（本文件） | 开发规范、进度跟踪方式 | **每次开始工作时** |

---

## 2. 代码规范

### 2.1 TypeScript 风格

| 规则 | 约定 | 示例 |
|------|------|------|
| **命名** | 类/接口/类型：PascalCase；函数/变量：camelCase；常量枚举：UPPER_SNAKE | `class TranslationTooltip` / `function getSelectionText()` |
| **接口** | 前缀 `I` 可选，但接口与实现必须区分 | 建议 `interface LLMProvider` / `class OpenAIAdapter implements LLMProvider` |
| **类型定义** | 统一放在 `types.ts` 或就近的 `*.types.ts` | `src/core/translator/types.ts` |
| **异步** | 一律使用 `async/await`，禁止裸 `.then()` | |
| **导出** | 默认导出一个类/函数；类型用具名导出 | `export default class Translator` / `export type TranslateOptions` |
| **文件命名** | PascalCase（与类名一致） | `Translator.ts` / `CacheManager.ts` |

### 2.2 代码组织原则

- **单一职责**：一个文件一个类/模块，不超过 300 行
- **依赖注入**：核心类不直接依赖 Obsidian 全局对象，通过构造函数注入
- **副作用隔离**：Obsidian API 调用集中在 `main.ts` 和 `ui/` 层，核心逻辑层不直接引用 `this.app`
- **错误处理**：所有外部调用（API、文件读写）必须有 try-catch，错误统一抛 `EasyReadError` 自定义异常类型

### 2.3 注释规范

```typescript
// 文件头注解（每个文件顶部）
/**
 * PDF 文本提取与清洗模块
 * 负责从 Obsidian PDF 预览视图中获取选中文本，
 * 并处理连字符、换行等排版 artifact。
 * @module core/pdf/PDFParser
 */

// 公共方法必须有 JSDoc
/**
 * 获取 PDF 中选中文本的视口坐标
 * @returns 坐标和页码信息，若无选中则返回 null
 */
getSelectionPosition(): PDFPosition | null

// 复杂算法步骤内联注释
// Step 1: 检测连字符断词模式 (word-\nword)
// Step 2: 合并并移除换行
```

### 2.4 Git 规范

```
<type>(<scope>): <subject>

类型: feat / fix / refactor / chore / docs / test / style
范围: core / provider / ui / settings / pdf / cache / project

示例:
feat(pdf): implement PDF text extraction and hyphenation handling
fix(provider): handle OpenAI 429 rate limit response
refactor(core): extract chunker into separate module
docs(roadmap): update PDF task dependencies
```

---

## 3. 目录结构速查

```
src/
├── main.ts                          # 插件入口（唯一引用 Obsidian Plugin 的地方）
├── manifest.json                    # Obsidian 插件清单
│
├── settings/
│   ├── SettingsTab.ts               # Obsidian PluginSettingTab 子类
│   ├── SettingsManager.ts           # 类型安全的配置读写封装
│   └── defaults.ts                  # 默认配置常量
│
├── core/
│   ├── translator/
│   │   ├── Translator.ts            # 翻译引擎：编排 Chunker + Provider
│   │   ├── Chunker.ts               # 文本分块与重构
│   │   └── types.ts                 # TranslateRequest / TranslateResponse / Chunk 等类型
│   ├── pdf/
│   │   └── PDFParser.ts             # PDF 文本提取 + 清洗（不依赖第三方库）
│   ├── cache/
│   │   └── CacheManager.ts          # 翻译缓存（loadData 存储 + LRU 淘汰）
│   ├── prompt/
│   │   └── PromptManager.ts         # System Prompt 模板 + 用户自定义合并
│   └── glossary/
│       └── GlossaryEngine.ts        # 术语表替换引擎（Phase 2）
│
├── providers/
│   ├── interface.ts                 # LLMProvider 接口定义
│   ├── index.ts                     # Provider 注册表
│   ├── OpenAIAdapter.ts
│   ├── AnthropicAdapter.ts
│   ├── AzureOpenAIAdapter.ts
│   └── OllamaAdapter.ts
│
├── ui/
│   ├── TranslationTooltip.ts        # 通用划词翻译气泡（MD 编辑器 + PDF 共用壳）
│   ├── PDFTooltipOverlay.ts         # PDF 专用浮动覆盖层（独立 DOM 容器）
│   ├── TranslationModal.ts          # 全文翻译设置弹窗
│   └── TranslationView.ts           # 双语对照侧边栏视图
│
└── utils/
    ├── tokenEstimator.ts            # Token 估算（启发式 / tiktoken）
    ├── requestQueue.ts              # 请求队列 + 并发控制 + 指数退避
    ├── debounce.ts                  # 通用 Debounce 工具
    └── logger.ts                    # 分级日志（debug / info / warn / error）
```

### 文件创建原则

- **新模块 = 新文件**，不要在一个文件里堆两个类
- **测试文件**与源文件同级，命名 `<ClassName>.test.ts`
- **测试数据**放在 `__fixtures__/` 目录（如长文本、PDF 文本样本）

---

## 4. 开发工作流（Agent 执行步骤）

每个 Agent 在执行任务时必须遵循以下流程：

### Step 1: 阅读上下文

```yaml
必读:
  - AGENT.md        # 本文件，了解规范
  - 03-开发路线图.md # 当前阶段、依赖关系、出口条件
  - 02-技术架构设计.md # 对应模块的接口和数据流

参考:
  - 01-产品概要设计.md  # 如有需求疑问
  - 已有代码文件        # 保持风格一致
```

### Step 2: 确认任务范围

从 `03-开发路线图.md` 中定位到当前要执行的 **Task-x.y**，确认：

1. 前置依赖全部完成（S 条件满足）
2. 当前 Task 的 **E 条件（出口条件）** 清晰
3. 涉及哪些文件（新建 vs 修改）

### Step 3: 执行

- **新建文件**：严格遵循 `02-技术架构设计.md` 中定义的接口和文件位置
- **修改已有文件**：先读取完整文件，再做精确 Edit
- **测试先行**（或至少测试并行）：核心逻辑模块必须有单元测试

### Step 4: 验证 E 条件

Task 完成后，逐条验证路线图中定义的 **E 条件**（Exit Criteria）：
- 功能是否可用？
- 单元测试是否通过？
- 边界情况是否覆盖？

### Step 5: 更新进度

根据 **第 5 节** 的规则更新进度文件，使之反映最新状态。

---

## 5. 进度跟踪机制

### 5.1 PROGRESS.md（项目根目录）

`PROGRESS.md` 是项目唯一的进度真相源（single source of truth）。Agent 在**每次完成任务后**必须更新它。

**格式：**

```markdown
# EasyRead 开发进度

## 当前阶段: Phase 0 — MVP

### Task-0.1: 项目骨架搭建
**状态**: ✅ 完成
**完成时间**: 2026-06-02
**关键产出**:
- `package.json` / `tsconfig.json` / `manifest.json` 初始化
- esbuild 构建配置，`npm run build` 产出 main.js

### Task-0.2: 设置系统
**状态**: 🔄 进行中
**负责人**: agent-<id>
**当前文件**: `src/settings/SettingsManager.ts`, `src/settings/SettingsTab.ts`
**待解决问题**:
- API Key 加密存储方案待确认

### Task-0.3: LLM Provider 接口 + OpenAI 适配器
**状态**: ⬜ 待开始
**前置依赖**: Task-0.2 ✅
**预计产出**: `src/providers/interface.ts`, `src/providers/OpenAIAdapter.ts`

---

## 变更记录

| 日期 | 变更内容 | 执笔 Agent |
|------|---------|-----------|
| 2026-06-02 | 初始化项目结构 | agent-init |
```

**状态标记：**

| 标记 | 含义 | Agent 行动 |
|------|------|-----------|
| ⬜ 待开始 | 前置未完成或未启动 | 检查前置依赖 |
| 🔄 进行中 | 当前正在执行 | 更新时补充进度详情 |
| ✅ 完成 | E 条件全部满足 | 记录完成时间和产出 |
| ❌ 阻塞 | 遇到外部阻塞无法继续 | 记录阻塞原因和需要的决策 |

### 5.2 更新规则

1. **每次 Agent 工作结束时**必须更新 PROGRESS.md
2. **开始一个新 Task**时：状态设为 🔄，记录 start time 和 agent id
3. **完成一个 Task**时：状态设为 ✅，记录 completion time 和关键产出
4. **遇到阻塞**：状态设为 ❌，详细描述阻塞原因，@用户决策
5. **修改已有代码**：在 Change log 中追加条目，格式 `| 日期 | 修改文件: 变更摘要 | agent-id |`

### 5.3 变更记录规范

```markdown
| 日期 | Agent | 文件 | 操作 | 摘要 |
|------|-------|------|------|------|
| 2026-06-02 | agent-init | main.ts | create | 插件入口注册基础命令 |
| 2026-06-02 | agent-init | settings/* | create | 设置面板 + 配置管理 |
| 2026-06-03 | agent-xyz | PDFParser.ts | create | PDF 文本提取与清洗 |
| 2026-06-03 | main.ts | agent-xyz | edit | 注册 PDF 划词命令 |
```

---

## 6. 测试规范

### 6.1 测试层级

| 层级 | 覆盖范围 | 工具 | 必须？ |
|------|---------|------|--------|
| **Unit** | 核心逻辑：Chunker、PDFParser、CacheManager、各 Provider Adapter | Vitest | ✅ 必须 |
| **Integration** | 跨模块：Translator + Chunker + Provider、设置读写流程 | Vitest + 模拟 Obsidian | ✅ 必须 |
| **E2E** | 实际 Obsidian 环境（手动） | 手动测试 | 发布前 |

### 6.2 单元测试要求

```typescript
// 每个测试用例覆盖：正常路径 + 边界情况 + 错误路径
// 文件名: Chunker.test.ts
describe('Chunker.chunk()', () => {
  it('应按标题分块', () => { /* ... */ })
  it('短文本应返回一个 Chunk', () => { /* ... */ })
  it('超过 maxTokens 的段落应按句子切分', () => { /* ... */ })
  it('每个 Chunk 尾部应有 10% Overlap', () => { /* ... */ })
  it('空文本应返回空数组', () => { /* ... */ })
})
```

### 6.3 模拟（Mock）策略

- **Obsidian API**：使用 `obsidian` 的接口类型，用 Vitest `vi.mock()` 模拟
- **LLM API**：拦截 fetch 调用，返回固定响应
- **文件读写**：模拟 `app.vault.read/write`

---

## 7. 通信规则

### 7.1 Agent 间协作

- **File Locking**：PROGRESS.md 中标记为 🔄 的 Task，其他 Agent 不应启动
- **跨 Agent 共享类型定义**：修改 `types.ts` 后必须在 PROGRESS.md 中通知
- **接口变更**：修改 `LLMProvider` 接口后，相关 Adapter 必须同步更新

### 7.2 向用户报告

1. **每个 Task 完成时**：向用户展示 E 条件验证结果
2. **遇到阻塞时**：立即报告阻塞原因 + 建议的 2-3 个解决方案
3. **每周摘要**（可选）：展示 PROGRESS.md 的当前概览

### 7.3 错误处理原则

```
用户看到的是翻译结果/错误通知
Agent 看到的是日志 + 错误堆栈
Agent 永远不要丢未捕获的异常到用户界面
```

---

## 8. 启动检查清单

当 Agent 被分配任务时，依次确认：

- [ ] 已读 `AGENT.md` 全文
- [ ] 已读 `03-开发路线图.md`，清楚当前阶段和依赖
- [ ] 已读 `02-技术架构设计.md` 中相关模块的设计
- [ ] 已检查 `PROGRESS.md` 确认没有并行冲突
- [ ] 已确认任务出口条件（E 条件）
- [ ] 已确保 `npm install` 依赖齐全
- [ ] 已确保 `npm run build` 通过
