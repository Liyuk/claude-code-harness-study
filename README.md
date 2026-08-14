# AI Agent OS Study

一个同时包含学习讨论与微内核实现的项目。研究对象是公开文档与可独立验证的行为模式；不收集、传播或依赖泄露源码、内部提示词或未发布功能。

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

## 项目结构

```text
learning/                 学习与讨论：概念、对照、研究资料
kernel/                   可实现、可测试的 AI OS 微内核
  contracts.md            先于代码的模块合同与不变量
  src/                    TypeScript / Node 内核实现
  tests/                  合同与场景测试
```

### 学习与讨论

- [架构基线](learning/architecture-baseline.md)：最小 loop 与生产化边界
- [讨论议程](learning/discussion-agenda.md)：供我们逐项讨论和做决定
- [生态与证据地图（2026-08）](learning/landscape-2026-08.md)：按 MECE 口径整理复现、开源替代品、论文、评测与安全资料
- [四种 Harness 架构对比](learning/harness-comparison-pi-codex-claude-deepseek.md)：Pi、Codex、Claude Code 与 DeepSeek Harness 的边界、取舍与可吸收设计

### Kernel 实现

- [微内核边界与实现顺序](kernel/README.md)
- [模块合同与安全不变量](kernel/contracts.md)
- [贡献与当前路线图](CONTRIBUTING.md)

## 建议的推进顺序

1. 在 `learning/` 理解 loop、权限、上下文与 OS 类比。
2. 在 `kernel/contracts.md` 锁定最小单 agent 的状态、系统调用与安全不变量。
3. 在 `kernel/src/` 实现 process manager、policy gate、tool broker 和 event store。
4. 在 `kernel/tests/` 用可重放任务证明权限、恢复和预算真的生效。
5. 最后才评估 planner / worker / verifier 或子代理机制是否真的必要。
