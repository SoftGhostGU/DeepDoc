## Context

四个问题根源不同但相互缠绕：

- **引用空白**是纯 CSS/布局问题。
- **导图展示产品本身** 是 `chat-window.tsx:457` 的 `document?.structureTree ? ... : mockDocumentTree` fallback 在产品稳定期的遗留。
- **路径只亮首尾** 是上一轮改动中 `getStageStatus` 的边界条件仍然覆盖不全——只把 query / generating / answer 三个 edge case 特判了，遗忘了中间四阶段在 `hasFinished` 下的 completed 语义。
- **热力图相关度 0** 是端到端的数据链缺陷：
  - DB 没段落字段 → `document.paragraphs` 永为 undefined；
  - SSE `retrieval_paragraphs` 没 score → 前端映射失败；
  - 前端又 dev fallback 到 mock。

上一轮为保 proposal 兼容性"只写前端"，回避了后端 payload，才导致热力图到现在也没真的工作过。这次设计纠正方向：**段落数据的权威来源是 SSE 实时事件（paragraph + score），不是 DB。** DB 只管文档结构树（已有）。

## Goals / Non-Goals

**Goals:**
- 热力图真实显示相关度梯度；鼠标悬停看到相关度百分比；点击命中引用。
- 导图展示用户文档的真实章节树；解析失败/未解析时有明确空态。
- 路径 7 个节点在流式结束后全部呈完成态；中间阶段不回退。
- 引用 Tab 底部不留未用空白；面板占满可视区。
- 去掉所有"看起来正常其实是 mock"的 dev fallback，降低后续回归风险。

**Non-Goals:**
- 不新增段落的 DB 字段；不持久化段落（当前每次问答 SSE 送达足够）。
- 不改段落精排算法。
- 不做热力图的真正"全文档段落染色"——段落池以本次检索返回的 top-K 为准。若未来需要展示全文档级视图，另起 change。
- 不改 `retrievedChunks` 的 id 约定。

## Decisions

### D1. 热力图数据源切换到 `retrievedParagraphs`
- **决策**：`DocumentHeatmap` 去掉 `paragraphs` 这个大而虚的 prop，改为直接消费 `retrievedParagraphs: ParagraphItem[]`（其中每项有 `score`）。无查询时显示引导态；有查询时用这些段落构造 treemap，直接用每项的 `score` 染色。
- **原因**：端到端最短路径——SSE 已经把相关段落送达前端，没必要再去 DB 查一遍；避免 id 命名空间错位。
- **替代 A**：继续让 DB 存 paragraphs + 走 `document.paragraphs` 主路径。拒绝理由：需加表、迁移、兼容、首次加载延迟，收益 0（热力图只需要检索命中段落）。
- **替代 B**：把 `retrievedChunks` 的 section 层级也染到热力图。拒绝理由：混合层级让用户更迷惑，上一轮就是这个思路才没修对。

### D2. SSE paragraph payload 增补字段
- **决策**：`rag-service/app/generation/streamer.py::_result_to_paragraph` 返回：
  ```python
  {
      "id": r.chunk_id,
      "node_id": r.section_id,
      "page": r.page,
      "index": getattr(r, "paragraph_index", 0),  # 或从 r 属性读真实 index
      "text": r.content[:200],
      "score": round(r.score, 4),
  }
  ```
  `ParagraphItem` 类型同步加 `score?: number`（可选以保兼容）。
- **原因**：score 是热力图染色的输入；真实 `index` 让 tooltip 可读。
- **风险**：`RetrievalResult` 若无 `paragraph_index` 属性，需要在 retriever 层补上。先读一遍 `app/retrievers/*` 确认；无则临时回退用 `r.chunk_id` 排序索引。

### D3. 移除所有 mock fallback
- **决策**：
  - `chat-window.tsx` 删除 `import { mockDocumentTree, mockDocumentOverview, mockParagraphs } from "@/lib/mock/data"` 中与 viz 相关的 mock 引用；删 `heatmapParagraphs`、`isParagraphDataReady` 两个 useMemo。
  - 导图：`<DocumentMindmap tree={document?.structureTree ?? null} />`，`DocumentMindmap` 在 `tree==null` 时渲染空态 "该文档未产出结构树"。
  - `mockDocumentOverview` 若仅用于"文档未选中时的占位"，可保留（不是本 change 的焦点），但要加注释说明仅用作无 document 时的骨架。
- **原因**：dev fallback 让 bug 难以暴露，上一轮就因此回归。

### D4. 路径图状态机补丁
- **决策**：修改 `getStageStatus`（或在 `RetrievalFlow` 内部扩展）：
  ```ts
  function getStageStatus(stage, isStreaming, currentStage, hasFinished) {
    if (hasFinished) return "completed";
    if (!isStreaming && !currentStage) return "inactive";
    if (stage === currentStage) return "active";
    if (!currentStage) return "inactive";
    const currentIdx = STAGE_ORDER.indexOf(currentStage);
    const stageIdx = STAGE_ORDER.indexOf(stage);
    return stageIdx < currentIdx ? "completed" : "inactive";
  }
  ```
  然后移除 `generating` 节点的特殊 completed 分支（统一由 `hasFinished` 驱动）。`query`、`answer` 仍保留各自特判（它们不在 `STAGE_ORDER` 里）。
- **原因**：消除上一轮只修 edge case 留下的 middle-stage 回退。

### D5. 引用面板布局
- **决策**：
  - `CitationPanel`：`<Card className="flex h-full flex-col ...">`，`CardContent` 加 `flex-1 min-h-0 p-0`，`ScrollArea` 改为 `h-full` 而不是 `h-[420px]`。
  - `chat-window.tsx` 的 `<TabsContent value="citations">` 外层保持 `flex-1 min-h-0`，内部为 `flex flex-col`，让 CitationPanel 与可选的"上下文视图" section 合理分配高度（CitationPanel `flex-1`，context section `auto`）。
- **原因**：消除像素级硬编码；贴合 Tabs 容器的自适应高度。

### D6. 状态机依赖 & chunkCount 展示
- **决策**：保留 `retrieving_paragraphs` 节点上 `chunkCount = retrievedParagraphs.length` 的徽标，这不受其他改动影响。

## Risks / Trade-offs

- **风险 1**：`RetrievalResult` 在 retriever 层可能没有 `paragraph_index` 属性 → 后端补字段时需小改 retriever。
  - 缓解：如无则取 `paragraph_results` 列表下标作为临时 index，仍胜于写死 0。
- **风险 2**：去掉 `mockDocumentTree` fallback 后，某些测试/截图/演示可能展示空态。
  - 缓解：空态文案明确、视觉可接受；并在 CLAUDE.md / AGENTS.md 补一句"mock 仅用于无 document 时"。
- **权衡**：热力图只染"检索命中段落"，视觉信息密度低于"全文档段落"。接受，因为这是用户真实看到检索结果的分布，更诚实。

## Migration Plan

- 纯代码改动；SSE payload 新增字段向后兼容。
- 发布顺序：先 rag-service 发新 payload → 再 web-app 消费字段。同时发布也无问题（向后兼容）。
- 回滚：代码 revert。
- 验证：
  - 手动：上传一篇真实 PDF，问一个会命中多段落的问题
    - 路径 tab：7 个节点流式过程中依次亮起；流式结束后全部绿色
    - 热力 tab：显示一组带分数分布的段落方块；tooltip 有分数；点击高亮引用
    - 导图 tab：显示该 PDF 的真实章节结构（不再是"第一章 问题定义"）
    - 引用 tab：卡片占满可视区域，无底部空白
  - 窄屏同样验证 pan/scroll。

## Open Questions

- `_result_to_paragraph` 里 `index` 是"段落在文档中的全局索引"还是"在检索结果中的序号"？倾向前者（用户看到的 tooltip "段落 17" 应指向文档中第 17 段）。如 retrieval 层未提供，作为后续另起 change 处理，先用结果序号临时顶替并在 tooltip 里说明。
