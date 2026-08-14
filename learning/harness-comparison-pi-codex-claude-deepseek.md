# Pi、Codex、Claude Code 与 DeepSeek Harness：四种 Agent Harness 路线

> 快照日期：2026-08-13。本文只使用各项目的官方公开文档、公开仓库和可观察行为；不使用泄露源码、反编译材料或未证实的内部实现推断。

## 一句话结论

这四者不是同一种东西：

- **Pi** 是“少给默认、把选择留给用户”的最小终端 harness。
- **Codex** 是“以 sandbox、审批和 patch review 为中心”的产品化 coding agent。
- **Claude Code** 是“以项目上下文、hooks、skills、rules 和 subagent 为中心”的可定制工作流产品。
- **DeepSeek Harness** 是“以 append-only event log 和一切皆插件”为中心的可组合 agent runtime。

所以不要问“哪个最好”；先问你要学习或优化的是**简洁、执行安全、团队工作流，还是可替换的 runtime 架构**。

## 比较口径

本文以同一组问题比较它们：

1. 什么是系统中不可替换的核心？
2. 上下文与状态如何保存、恢复或分叉？
3. 模型怎样获得工具，工具怎样受到约束？
4. 人如何介入高风险副作用？
5. 新能力是修改核心，还是在边界处扩展？

模型能力、价格、benchmark 分数不在本文比较范围；它们会随版本、provider、预算和任务集快速变化，而且不能替代 harness 层的比较。

## 总览

| 维度 | Pi | Codex | Claude Code | DeepSeek Harness |
|---|---|---|---|---|
| 主定位 | 最小、可塑的终端 coding harness | 产品化 coding agent / CLI 与托管执行面 | 面向开发工作流的本地 coding agent | 可组合、事件驱动的 agent runtime |
| 开放性 | MIT 开源 | Codex CLI 开源；完整产品还有托管面 | 产品核心闭源；公开文档和集成面丰富 | MIT 开源，仍是 developer preview |
| 架构哲学 | 少做内建功能，用 extension/package 补充 | 审批、sandbox、patch 与执行策略优先 | 上下文工程与确定性生命周期扩展优先 | 一切皆 plugin，事件日志为事实来源 |
| 持久状态 | JSONL session tree；可分叉、压缩、导出 | 公开重点是任务执行和审批；不把内部状态模型当合同 | 公开重点是 session/context/compaction 行为 | append-only `SessionEvent` log；从 log 投影模型历史 |
| 安全重点 | 项目 trust 决定是否加载项目资源/extension | sandbox、网络策略、审批策略与 diff 审核 | permission modes、规则、hooks、sandbox 与人工监督 | 工具执行管线中的 policy、approval、monotonic guards、sandbox |
| 扩展方式 | TypeScript extensions、skills、prompt templates、Pi packages | 产品配置、MCP、skills/plugins 与 API/SDK surface | CLAUDE.md、rules、skills、hooks、MCP、plugins、subagents | Cordis plugins、profile、bundle、patch、capability seam |
| 内建多 agent | 刻意不内建；交给 extension/package | 产品能力会演进，本文不将其作为内核合同 | 公开支持 subagents 和权限限制 | subagent provider 是可替换 seam |
| 最值得借鉴 | 简洁与 session tree | 安全执行与 diff-first 人机协作 | 上下文加载时机与确定性 hook | event sourcing 与能力接口分离 |

## 1. Pi：把 Harness 收到最小

[Pi](https://github.com/earendil-works/pi) 自称为 minimal terminal coding harness。它默认只给模型 `read`、`write`、`edit`、`bash` 四个工具；而 subagent、plan mode 等复杂工作流明确不作为内建功能，用户可借助 TypeScript extension、skills、prompt template 和 package 自行加入。

它的关键设计是 **session tree**：会话保存为 JSONL，事件用 `id` 和 `parentId` 形成分支；用户可在历史节点继续、fork、clone，并对长上下文进行 compaction。完整历史仍保留在 JSONL 中。这是“先把个人 agent 的可恢复思考轨迹做好”的路线。

Pi 的另一条安全边界是 **project trust**：未信任项目中的本地设置、资源和 extension 不会自动加载。它很适合提醒我们：项目配置本身也是不可信输入，不能因为模型打开了一个目录就自动拥有执行其中 agent 代码的权力。

Pi 的局限不是缺陷，而是取舍：它把审批、子 agent、企业策略等上层机制交给扩展生态，因此更适合想亲手决定工作流的个人开发者，而不是开箱即用的强治理平台。

**我们应学：** 保持最小核心；session 应支持分叉和恢复；把“是否信任项目配置”视为独立权限决定。

## 2. Codex：把副作用关进 sandbox 和审批流程

[Codex 官方文档](https://developers.openai.com/codex/) 将交互重点放在本地或托管环境中的受控执行。公开的审批模型会根据策略要求人工确认高风险操作；sandbox 约束工作目录、文件系统和网络。对文件修改，用户先看到 unified diff，再选择接受或拒绝；对命令，批准后才在配置的 sandbox 中运行并把输出、退出码和耗时回传给 agent。[审批与 sandbox 说明](https://developers.openai.com/codex/concepts/approvals)

这对应传统 OS 的思路：模型提出 syscall，kernel 决定该 syscall 是否落在可用 capability 内。Codex 的价值不在于让模型“少问问题”，而是让自动化在清晰的执行边界中继续工作：目录不在版本控制下会提示；全自动模式也依赖 sandbox 与网络策略。

对外部研究者，不应假设 Codex 的内部 session store、调度器或上下文压缩实现。它们不是公开稳定架构合同。我们可以引用和学习的是：**审批策略、sandbox scope、网络策略、patch review、执行结果回传**这些可观察安全面。

**我们应学：** 把真正写磁盘的 `apply_staged_write` 设计成独立 syscall：先给 diff，再取得批准，最后在 sandbox 内应用，并记录执行结果。

## 3. Claude Code：把“上下文如何进入模型”做成一等问题

Claude Code 的公开设计重点不是宣称一个单一 kernel，而是提供多种控制行为的机制：`CLAUDE.md`、rules、skills、subagents、hooks、output styles 和系统提示词追加。它们的差别在于**何时加载、是否能在 compaction 后保留、占多少 context、拥有多大权限**。[官方说明](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more)

其中 hooks 很关键：它们让格式化、检查、审批或日志等逻辑在明确生命周期点由确定性代码执行，而不是期待模型每次都“记得”。Subagent 又给每个任务独立的指令、工具清单和 permission mode，主会话只接收其最终摘要；这避免把所有中间噪声放入同一 context。[自定义 subagent 文档](https://code.claude.com/docs/en/sub-agents)

Claude Code 的公开权限模型还支持 path/tool 范围的允许、拒绝和询问规则，结合 sandbox 和人工监督。这里的架构启发是：**模型可见上下文、工具可见性、执行授权，必须是三个不同层，而不是一个 “allow shell” 开关。**

由于核心实现并非开放架构合同，本项目只学习其公开行为和设计模式，不据此推断内部数据结构。

**我们应学：** `ContextManager` 应有显式的加载优先级和 compaction 规则；hook 应是内核外的确定性扩展点；子 agent 默认缩小权限与 context。

## 4. DeepSeek Harness：把事件和插件做成 runtime 的中心

[DeepSeek Harness（dsh）](https://github.com/deepseek-ai/deepseek-harness) 是 DeepSeek AI 的 MIT 开源项目，目前仍标注为 developer preview。它构建在 Cordis 上，并提出“everything is a plugin”：模型 adapter、tool registry、session log、agent loop、sandbox 和 approval policy 都是可组合、可替换的 plugin。运行实例由 profile、bundle 和 patch 层叠加而成。[官方架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/main/docs/architecture.md)

它最重要的设计选择是：**session log 是模型上下文的事实来源**。模型可见的内容必须能从 append-only event log 重建；fork、resume、transcript、telemetry、持久化都从同一条流派生。这比“在内存里维护 messages 数组，偶尔序列化一下”强得多，因为恢复与审计面对的是同一事实。

它的一个 turn 可以包含多个 step；每个 step 是一次模型请求和它发出的工具调用。工具路径会先记录 `tool/call`，再经历 pre-execute、guards、approval、sandbox、execute、post-execute、结果规范化，最终产生唯一、不可变的 `tool/result` 进入模型上下文。[工具执行管线](https://github.com/deepseek-ai/deepseek-harness/blob/main/docs/tool-execution-pipeline.md)

但“everything is plugin”也有成本：配置覆盖顺序、插件加载、服务身份、patch 兼容性和可信计算基都更复杂。官方自己已声明 preview 期间会有 breaking changes。因此它很适合研究“成熟 runtime 应有的边界”，不适合成为我们当前最小 kernel 的直接模板。

**我们应学：** 下一阶段优先实现 append-only event store；只让明确的 capability seam 替换工具/provider；权限、审计和身份不能被普通 plugin 静默替换。

## 四者对 AI OS 的不同回答

```text
Pi             = 先给最小可用的用户态，再把工作流留给扩展
Codex          = 先把真实副作用关入 sandbox 与审批系统
Claude Code    = 先管理好上下文、规则与确定性生命周期扩展
DeepSeek dsh   = 先把可重放事件和可组合服务作为运行时基础
本项目 Kernel  = 先建立不可绕过的 capability、审计与恢复内核
```

这五条路线可以组合，但顺序不能颠倒。没有不可绕过的权限和事件记录之前，过早加 plugin、subagent 或自动化，只会扩大系统不可解释、不可恢复和不可控的面积。

## 对本项目的吸收计划

| 优先级 | 吸收来源 | 要做的最小实现 | 不做什么 |
|---:|---|---|---|
| P0 | Codex | `apply_staged_write`：展示 diff，单次审批后才写入 workspace | 不接 shell/网络 |
| P0 | DeepSeek Harness | append-only JSONL event store；从事件恢复 task 与审批状态 | 不做全插件系统 |
| P1 | Pi | session/checkpoint fork；保留历史分支 | 不做完整 TUI |
| P1 | Claude Code | 明确的 context loading 和 hook contract | 不复制产品私有行为 |
| P2 | DeepSeek Harness | provider/tool capability seam | 不允许 plugin 替换 policy gate |
| P3 | Claude Code / Pi | 受限 subagent 或 extension | 不默认共享 workspace/全部权限 |

## 选型建议

- 想学习最小 coding-agent loop、session tree 和可塑性：先读 **Pi**。
- 想学习人机审批、sandbox、patch review 与自动化边界：先看 **Codex** 的公开安全面。
- 想学习生产工作流中的 context、project rules、hook 与 delegation：先看 **Claude Code** 的公开配置模型。
- 想学习完整 runtime 的 event sourcing、工具事件管线、profile/bundle/plugin：先读 **DeepSeek Harness**。
- 想真正理解上述系统为什么能安全运行：继续实现本项目的 **Kernel**，并为每一个新能力写可重放的越权、失败与恢复测试。

## 来源

- [Pi coding-agent README](https://github.com/earendil-works/pi/tree/main/packages/coding-agent)
- [Codex 官方文档](https://developers.openai.com/codex/) 与 [审批/安全文档](https://developers.openai.com/codex/concepts/approvals)
- [Claude Code 的 steering 指南](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more) 与 [subagent 文档](https://code.claude.com/docs/en/sub-agents)
- [DeepSeek Harness 官方仓库](https://github.com/deepseek-ai/deepseek-harness)、[架构](https://github.com/deepseek-ai/deepseek-harness/blob/main/docs/architecture.md)、[工具管线](https://github.com/deepseek-ai/deepseek-harness/blob/main/docs/tool-execution-pipeline.md)
