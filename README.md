# Claude Code Harness Study

一个用于讨论和复现实用 coding-agent harness 设计的研究项目。研究对象是公开文档与可独立验证的行为模式；不收集、传播或依赖泄露源码、内部提示词或未发布功能。

## 当前问题

> 如何构建一个可审计、可恢复、受权限约束的 coding-agent loop，而不是只把模型和 shell 工具串在一起？

## 讨论地图

```text
用户任务 / 工作区
        |
        v
Context builder -----> 可缓存的稳定前缀
        |              项目说明、策略、工具 schema
        v
   Agent loop --------> 预算、终止、重试与恢复
        |
        +--> Tool router --> Policy gate --> Sandboxed executor
        |                        |                 |
        +<---- observations <----+-----------------+
        |
        +--> Checkpoint / compacted memory
```

## 文档

- [架构基线](docs/architecture-baseline.md)：最小 loop 与生产化边界
- [讨论议程](docs/discussion-agenda.md)：供我们逐项讨论和做决定
- [生态与证据地图（2026-08）](docs/landscape-2026-08.md)：按 MECE 口径整理复现、开源替代品、论文、评测与安全资料

## 建议的推进顺序

1. 定义最小单 agent loop 的状态和接口。
2. 把 tool router、policy gate、executor 分离，先做可审计的权限边界。
3. 增加 checkpoint、预算与 context compaction。
4. 最后才评估 planner / worker / verifier 或子代理机制是否真的必要。
