# Contributing

这个仓库同时是学习记录与一个安全优先的 AI OS 微内核。改动应小、可验证、可审计。

## 提交前

1. 先更新 `kernel/contracts.md`，再实现可观察行为。
2. 新行为先写一个会失败的测试，再写最小实现。
3. 运行 `npm test`；CI 使用 Node 24。
4. 不提交 `.DS_Store`、`.env`、token、工作区副本、模型输出或来源不明的 Claude Code 源码材料。

## 项目边界

- `learning/`：资料、讨论与设计决策；不应成为实现真相的唯一来源。
- `kernel/`：可运行的合同、代码和测试；安全不变量必须由测试覆盖。
- 每次新增有副作用的工具，都必须说明 capability、审批策略、sandbox、事件记录和恢复语义。

## 当前路线图

1. 已完成：内存内的权限 gate、预算、事件轨迹；受限读取与暂存写入。
2. 下一项：持久 event store 与 checkpoint 恢复。
3. 之后：显式审批的 `apply_staged_write`，再考虑受限测试命令。
