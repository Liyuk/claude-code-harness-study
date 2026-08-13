# Coding-agent Harness landscape（2026-08 快照）

## 结论先行

本项目研究的是**可审计、可恢复、受权限约束的 coding-agent harness**，不是 Claude Code 的源码复刻。

- 严格口径下，**已验证的 Claude Code 全兼容 clean-room 复现：0 个**。
- 有 **1 个值得研究的从零教学型 harness**：[`shareAI-lab/learn-claude-code`](https://github.com/shareAI-lab/learn-claude-code)，自述为 "Claude Code-like" 的最小实现；它不是兼容克隆。
- "Claude Code" 关键词的 GitHub 搜索有大量结果，但绝大多数是配置、插件、API 路由、工作流或源码/反编译衍生物。它们不能计为复现数。
- 主要的开源竞争格局不是“复制 Claude Code”，而是不同的产品外壳和运行时取舍：终端/IDE 交互、隔离执行、模型无关性、任务编排与评测。

本文的 GitHub 采用数据均为 **2026-08-12（America/Los_Angeles）** 取得的公开快照。Star 和 fork 是关注度信号，不是用户数、安装量或质量分数。

## 口径：如何避免把不相干的项目算作“复现”

一个项目只有同时满足下列三项，才会被记为“已验证 clean-room 复现”：

1. 有可运行的独立 agent runtime，而非配置/包装器；
2. 公开说明其兼容目标与行为边界，并可通过测试或可观察行为验证；
3. 有足够的来源说明，能确认不是基于未授权源码、source map、反编译或泄露材料。

当前没有公开项目通过这三项筛选。`learn-claude-code` 通过第 1 项，且是安全的教学参考，但其目标是“like”而非兼容，故单列为**启发式实现**。

明确排除：源码镜像、source-map 重建、反混淆、声称“可运行官方源码”的仓库，以及依赖其结论的架构分析。这既不符合本项目的研究伦理，也不能作为独立设计的证据。

## MECE 地图

每个项目按**主要价值层**只出现一次；若跨层，放在它最核心的一层。

```text
编码 agent 生态
├── A. 参考产品（非开源竞争实现）
│   ├── Claude Code（闭源产品；公开文档/API/Actions）
│   └── Codex、Cursor、GitHub Copilot、Devin（产品基准）
├── B. Claude Code 启发式实现
│   └── 最小教学 harness（learn-claude-code）
├── C. 开源替代品
│   ├── C1. Agent runtime / 自主问题修复
│   ├── C2. 面向开发者的终端或 IDE 产品
│   └── C3. 现有 agent 的工作流、路由与控制面
├── D. 评测与论文
│   ├── D1. 架构与方法基线
│   ├── D2. 任务评测
│   └── D3. 安全评测
└── E. 可引用的公开分析
    └── 官方文档与同行评审/预印本；不使用泄露源码分析
```

## A. 参考产品：用于比较，不视为可复用源码

| 项目 | 边界 | 本项目如何使用 |
|---|---|---|
| [Claude Code](https://github.com/anthropics/claude-code) | Anthropic 的产品及公开集成仓库；该仓库未声明开源许可证 | 用公开文档验证权限、skills、hooks、subagents 等可观察行为；不推导内部实现。|
| [Claude Code Action](https://github.com/anthropics/claude-code-action) | MIT 的 GitHub Action 集成 | 参考 CI 中的人机审批、凭证和隔离边界。|
| Codex、Cursor、GitHub Copilot、Devin | 商业/托管产品 | 作为产品体验和公开 benchmark 的比较对象；不作为 harness 源码依赖。|

## B. Claude Code 启发式实现：1 个可研究样本

| 项目 | 公开信号（快照） | 为什么归类于此 | 采用建议 |
|---|---:|---|---|
| [`shareAI-lab/learn-claude-code`](https://github.com/shareAI-lab/learn-claude-code) | 74,028 stars / 11,989 forks，MIT，活跃 | 自述为从 0 到 1 的 "nano Claude Code-like agent harness"，用 Bash 展示最小 loop | **高**：读其最小状态机与工具循环；不要把它当 API/行为兼容实现。|

与之相邻、但不计入本类的项目包括：为 Claude Code 添加循环的 [`ralph-claude-code`](https://github.com/frankbria/ralph-claude-code)（工作流层），以及为多种 agent 处理模型路由的 [`claude-code-router`](https://github.com/musistudio/claude-code-router)（控制面层）。

## C1. 开源替代品：agent runtime / 自主修复

| 项目 | 公开信号（快照） | 核心取舍 | 对本项目的价值 |
|---|---:|---|---|
| [OpenHands](https://github.com/OpenHands/OpenHands) | 83,853 stars / 10,853 forks，MIT，活跃 | 通用 agent 平台，强调 sandbox、浏览、命令行、多 agent 与评测 | **最高**：模块边界、运行隔离、可插拔 agent 与 benchmark 接口。|
| [SWE-agent](https://github.com/SWE-agent/SWE-agent) | 20,052 / 2,193，MIT，活跃 | 将 issue → 修复作为明确任务合同，强调轨迹和 SWE-bench | **最高**：最窄可评测 loop、patch 合同、评测可复现性。|

## C2. 开源替代品：终端 / IDE 产品

| 项目 | 公开信号（快照） | 主界面/定位 | 对本项目的价值 |
|---|---:|---|---|
| [OpenCode](https://github.com/anomalyco/opencode) | 196,702 / 25,283，MIT，活跃 | 模型无关的开源 coding agent | 多 provider、交互式 CLI 与产品化配置。|
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | 106,495 / 14,429，Apache-2.0，活跃 | Gemini 的终端 agent | 官方模型绑定 CLI 的权限与工具 UX。|
| [Cline](https://github.com/cline/cline) | 66,095 / 7,098，Apache-2.0，活跃 | SDK、IDE extension、CLI 三种入口 | 模型无关的用户审批与 IDE 体验。|
| [Goose](https://github.com/aaif-goose/goose) | 52,738 / 5,997，Apache-2.0，活跃 | 可扩展的执行/编辑/测试 agent | extension 协议和桌面/CLI 边界。|
| [Aider](https://github.com/Aider-AI/aider) | 48,158 / 4,835，Apache-2.0，近期活跃较弱 | 终端 pair programming | Git-aware 编辑与人类协作的轻量基线。|
| [Continue](https://github.com/continuedev/continue) | 35,462 / 5,221，Apache-2.0，活跃 | IDE/CLI 的开源 coding agent | 配置、模型路由、企业集成。|
| [Crush](https://github.com/charmbracelet/crush) | 27,315 / 2,152，未声明 SPDX，活跃 | 终端 UX 导向的 coding agent | TUI 与交互控制。|
| [Qwen Code](https://github.com/QwenLM/qwen-code) | 26,954 / 2,848，Apache-2.0，活跃 | Qwen 的终端 coding agent | 另一种模型绑定 CLI 取舍。|
| [Mistral Vibe](https://github.com/mistralai/mistral-vibe) | 4,816 / 626，Apache-2.0，活跃 | 极简终端 coding agent | 简化 loop 的反例/最小基线。|

`Roo-Code` 旧仓库在本快照中已 archived，故不列为当前候选；保留它只会混淆活跃生态。

## C3. 开源替代品：工作流、路由与控制面

| 项目 | 公开信号（快照） | 不与 C1/C2 混算的原因 | 对本项目的价值 |
|---|---:|---|---|
| [Ralph Claude Code](https://github.com/frankbria/ralph-claude-code) | 9,596 / 722，MIT | 调度已有 Claude Code 会话，不实现基础 runtime | 长任务退出检测、任务重试和阶段化。|
| [Claude Code Router](https://github.com/musistudio/claude-code-router) | 36,612 / 3,053，MIT | 为多 agent 管理模型与能力，不是 coding loop | provider 路由、成本/能力策略。|

## D1. 论文：架构与方法基线

| 论文 | 贡献 | 对本项目的直接结论 |
|---|---|---|
| [OpenHands（2024）](https://arxiv.org/abs/2407.16741) | 把写代码、CLI、浏览、sandbox、多 agent、评测放在同一开放平台 | runtime、executor 与 benchmark adapter 应解耦。|
| [SWE-agent（2024）](https://arxiv.org/abs/2405.15793) | 以 ACI（agent-computer interface）降低 agent 与环境交互的复杂度 | 工具接口是性能与可控性的一等设计对象。|
| [Agentless（2024）](https://arxiv.org/abs/2407.01489) | localization → repair → validation 三阶段基线，质疑复杂 agent 的必要性 | 先证明单 agent 的最小 loop；多 agent 不是默认答案。|
| [LLM-based Agents for SE survey（2024）](https://arxiv.org/abs/2409.02977) | 汇集 106 篇论文并从 SE 与 agent 双视角分类 | 用任务、agent、环境、评测四轴比较，别只比模型。|

## D2. 论文与基准：任务能力不能只看 SWE-bench

| 基准 | 测什么 | 应纳入的原因 |
|---|---|---|
| [SWE-bench](https://www.swebench.com/) | 真实 GitHub issue 的 patch 是否通过隐藏测试 | 仍是 issue-resolution 的通用可比较入口；需固定版本、模型、预算与 patch 生成方式。|
| [RExBench](https://arxiv.org/abs/2506.22598) | 在既有论文/代码库上实现研究扩展 | 测更开放的研究式编码任务；已比较 aider、Claude Code 和 OpenHands。|
| [SWE-Bench Mobile](https://arxiv.org/abs/2602.09540) | 生产 iOS 代码库中的移动端任务 | 防止把 Python issue 修复误当作通用软件工程能力。|
| [Claw-SWE-Bench](https://arxiv.org/abs/2606.12344) | 固定 prompt、预算、工作区、patch 提取和 evaluator 的 harness 对比 | 直接对应本项目：把 harness 与成本核算作为一等变量。|

**评测锁定规则：** 每个结果必须同时记录模型版本、harness 提交、任务集版本、权限/网络策略、预算、重复次数、成功判定和完整轨迹。缺其中任一项，不做横向结论。

## D3. 安全：必须作为 harness 的约束，而不是上线后的补丁

| 资料 | 风险/启示 |
|---|---|
| [Claude Code permissions 文档](https://code.claude.com/docs/en/agent-sdk/permissions) | 工具可见性、allow/deny、approval mode 必须在执行器前形成可审计判定。|
| [GitInject（2026）](https://arxiv.org/abs/2606.09935) | 不受信内容进入具备仓库权限的 agent，会产生 prompt injection 与供应链风险；测试要在真实隔离仓库中跑。|
| [AgentDyn（2026）](https://arxiv.org/abs/2602.03117) | prompt injection 不应只测固定模板；需覆盖动态、开放任务。|

## E. 可采用的公开分析（证据层级）

1. **一级：官方行为文档。** [权限](https://code.claude.com/docs/en/agent-sdk/permissions) 与 [skills / hooks / rules / subagents 的使用指南](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more)。用于定义可观察合同。
2. **二级：开源项目代码、测试、release 与 issue。** 用于理解其自身设计，不能反推 Claude Code 内部实现。
3. **三级：论文和独立基准。** 用来验证设计假设和测量方式。
4. **排除：** 来源不清的 reverse engineering、source-map、反编译、泄露源码及其二手“深度解析”。它们不进入架构决策、引用或训练材料。

## 下一步：把清单转为可执行研究

按价值/工作量排序：

1. 对 `learn-claude-code`、SWE-agent、OpenHands 各做一页“loop / context / tool / permission / checkpoint / evaluation”对照卡。
2. 在本仓库实现一个 100–300 行的最小单 agent loop，并把策略 gate 与 executor 分开。
3. 以 SWE-bench 的极小固定子集或自建 5–10 个可重放任务，记录全量 trace；先比较单 agent 的三种上下文/权限策略。
4. 最后才增加子 agent，并用相同模型、任务、预算与隔离策略做增量实验。
