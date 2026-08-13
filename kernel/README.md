# AI OS Microkernel

这里放的是实现，不是产品 UI，也不是某个模型供应商的 SDK 封装。

内核的职责是把不确定的模型限制在可审计的能力范围内：创建任务、分配预算、装载上下文、判定权限、代理工具调用、记录事件，并从 checkpoint 恢复。

## 边界

内核**负责**：

- agent 进程生命周期与预算；
- capability-based 权限判定与人工审批；
- 统一的工具调用合同、超时、取消和输出脱敏；
- 事件日志、checkpoint、恢复和审计；
- 把模型调用与实际副作用隔离。

内核**不负责**：

- 模型训练、推理服务或聊天 UI；
- 直接管理硬件、真实操作系统进程或网络栈；
- 默认的多 agent 编排、插件市场或向量数据库。

这些功能可以在内核稳定后作为用户态服务添加。

## 实现顺序

1. `process_manager`：创建、暂停、恢复、完成或失败一个单 agent 任务。
2. `policy_gate`：在所有副作用前依据 capability 和审批状态作出 `ALLOW`、`ASK` 或 `DENY` 决定。
3. `tool_broker`：验证工具请求，并只通过 sandboxed executor 执行。**第二阶段已完成首个 adapter：** `FileSystemExecutor` 只能访问一个 workspace，`read_file` 真实读取，`write_file` 只生成暂存 diff。
4. `event_store`：先记录意图和决策，再记录执行结果；支持 checkpoint。
5. `context_manager`：选择当前轮最小必要上下文；旧历史以摘要或检索保存。
6. 以场景测试覆盖预算耗尽、拒绝越权、执行中断与从 checkpoint 恢复。

先保持单 agent、单工作区、四个工具（读、写、搜索、运行测试）。目前只有读与暂存写可用；多 agent 只能在这些合同和测试稳定后加入。

## 目录约定

```text
kernel/
├── contracts.md       对外可观察合同和不变量
├── src/               实现；模块名与 contracts.md 对齐
└── tests/             合同测试、恢复测试和安全场景测试
```

实现语言尚未锁定，故当前不添加特定语言的构建工具。选择语言时，必须把类型、错误语义和测试命令写入此目录。
