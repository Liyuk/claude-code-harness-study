# Kernel Contracts

这是实现前的合同。模型、工具、存储和 UI 都是内核的调用方或被管理者；它们不能绕过这些规则。

## 核心对象

| 对象 | 必有字段 | 责任 |
|---|---|---|
| `AgentProcess` | `id`、`goal`、`workspace`、`capabilities`、`budget`、`state` | 一个可暂停、恢复和审计的任务。|
| `ToolRequest` | `requestId`、`processId`、`tool`、`input`、`reason` | 模型提出的系统调用；尚未执行。|
| `PolicyDecision` | `requestId`、`outcome`、`rule`、`approvalId?` | `ALLOW`、`ASK` 或 `DENY` 的确定性判定。|
| `ToolResult` | `requestId`、`status`、`output`、`effects` | executor 的结构化、可截断结果。|
| `Event` | `eventId`、`processId`、`kind`、`timestamp`、`payload` | 追加式审计记录。|
| `Checkpoint` | `processId`、`eventOffset`、`contextRef`、`workspaceRef` | 任务可恢复的一致状态。|

## 状态机

```text
CREATED → RUNNING → WAITING_APPROVAL → RUNNING
                  ↘ PAUSED → RUNNING
RUNNING → COMPLETED | FAILED | CANCELLED | BUDGET_EXHAUSTED
```

终态不可重新进入 `RUNNING`；恢复必须创建新的运行尝试，并引用原 checkpoint。

## 系统调用路径

```text
model → ToolRequest → schema validation → policy gate
      → (ASK: human approval) → sandboxed executor → ToolResult
      → append Event → context manager → model
```

模型永远拿不到 executor 或凭证的直接引用。

## 安全不变量

1. **完全中介：** 每一次有副作用的工具调用都必须经过 `policy_gate`。
2. **默认拒绝：** 没有匹配 capability 的请求必须是 `DENY`，不能用模型文本补授权。
3. **最小权限：** capability 必须是可范围限定的，例如 `read:workspace/**`，而不是笼统的 “shell allowed”。
4. **先记账：** 对有副作用的调用，在执行前记录请求和决策；执行后记录结果或失败。
5. **工具输出不可信：** 外部命令、网页、issue 和文件内容可进入上下文，但不能改变权限或系统规则。
6. **预算可强制：** token、时间、工具调用和费用上限由内核检查，模型不能自行覆盖。
7. **子进程不自动提权：** 将来创建子 agent 时，默认只继承显式缩小后的 capability 集。

## 统一错误语义

所有内核错误使用结构化结果：

```text
{ code, message, retryable, requestId? }
```

首批错误码：`INVALID_REQUEST`、`CAPABILITY_DENIED`、`APPROVAL_REQUIRED`、`BUDGET_EXHAUSTED`、`TOOL_TIMEOUT`、`EXECUTION_FAILED`、`CHECKPOINT_INVALID`。

## 首批合同测试

1. 没有 `write:workspace/src/**` capability 时，写入必须被拒绝，且 executor 从未收到请求。
2. `ASK` 的请求在人工批准前不得执行；拒绝后进入可解释的终态或继续规划。
3. 工具超时应写入事件，消耗正确预算，并不让进程卡死。
4. 中断后从 checkpoint 恢复，不能重复已记录的不可重试副作用。
5. 工具输出中的“忽略权限”文本不能改变 `PolicyDecision`。
