# 架构基线：从 agent loop 到 harness

## 1. 最小可用 loop

```text
state = initialize(task, workspace, policy)

while state.budget.remaining() and not state.done:
  context = build_context(state)
  response = model(context, tools=available_tools(state))

  if response.is_final:
    state.done = true
    state.result = response.text
    continue

  for call in response.tool_calls:
    decision = policy.authorize(call, state)
    observation = execute_or_reject(call, decision)
    state.append(observation)

  state = checkpoint_and_compact_if_needed(state)
```

这个 loop 故意保持朴素：模型负责提出行动，harness 负责组装上下文、执行或拒绝行动，并把可验证的观察结果回灌。

## 2. 需要彼此独立的边界

| 层 | 职责 | 不应承担的职责 |
| --- | --- | --- |
| Context builder | 选择、排序、压缩输入 | 直接执行动作 |
| Agent loop | 调度回合、预算、停止 | 绕过策略做授权 |
| Tool router | 验证 schema、分派工具 | 自主决定风险接受度 |
| Policy gate | 权限、路径/网络/命令规则、升级 | 生成模型回复 |
| Executor | 在受限环境中运行 | 解释用户意图 |
| Checkpoint store | 可恢复状态和审计记录 | 充当无限对话历史 |

## 3. 核心状态

```ts
type RunState = {
  task: string
  workspace: WorkspaceRef
  transcript: Message[]
  observations: Observation[]
  checkpoints: CheckpointRef[]
  budget: { turns: number; tokens?: number; timeMs: number; cost?: number }
  policy: PolicySnapshot
  status: 'running' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled'
}
```

设计原则：`transcript` 只是模型可见的工作记忆；审计与恢复依赖结构化事件、文件 diff、执行结果和 checkpoint，而不是依赖模型把旧对话“记住”。

## 4. 讨论中的默认立场

- 默认拒绝不可逆或外部副作用明显的工具调用，明确批准后才放行。
- 工作区文件、工具输出、网页内容、MCP 返回值都属于不可信输入，不能直接提升为系统指令。
- 每次工具调用应记录：请求、授权原因、实际执行、退出状态、摘要及相关 diff。
- 上下文不足时优先压缩已验证的事实和未完成计划，而不是截断最近失败信息。
- 子代理不是基础设施前提；只有在并行探索或需要隔离上下文时引入。

## 5. 值得验证的假设

1. 结构化 checkpoint 是否比长对话续写更能提高长任务恢复率？
2. 细粒度工具相比通用 shell，是否以少量灵活性换来更高的可控性与评估性？
3. verifier 应当是独立模型回合，还是优先使用测试、lint、类型检查等确定性证据？
