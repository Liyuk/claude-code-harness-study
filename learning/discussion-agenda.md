# Harness 讨论议程

每一项讨论都应该产出一个可以实施或验证的决定，而不止停留在概念比较。

## A. Loop contract

- 一个回合的输入、输出和错误如何建模？
- final answer、tool call、需要批准、预算耗尽分别怎样终止？
- tool call 批量执行还是每个调用后立刻回灌观察？

**待定决策：** 采用单工具逐步回灌作为第一版，以最大化可观察性。

## B. Context engineering

- 哪些内容是稳定前缀，哪些必须按回合动态生成？
- 项目指令如何发现，并在什么信任边界后才加载？
- 何时 compaction，压缩结果采用什么 schema？

**待定决策：** 压缩时保留目标、约束、已验证事实、未完成计划、失败原因、最新 diff 摘要。

## C. Tool and permission model

- 命令、文件写入、网络、Git 和 MCP 各自需要什么能力令牌？
- 哪些操作可自动批准，哪些必须让人确认？
- 如何防止 prompt injection 借由工具输出扩大权限？

**待定决策：** Policy gate 不接受模型的“这是安全的”作为授权依据，只评估结构化 action 与环境规则。

## D. Long-running execution

- checkpoint 的最小粒度是什么？
- 如何检测循环、无进展、重复读取或无效重试？
- 恢复时如何重建上下文而不重复副作用？

## E. 多 agent 是否必要

- planner / executor / verifier 的收益是否超过 coordination cost？
- 哪些任务适合隔离子任务的上下文？
- verifier 的结论如何必须落到可复现证据？

## 首次讨论建议

从 **A：Loop contract** 开始：我们先确定状态机、事件日志与终止条件，然后再决定工具和记忆细节。
