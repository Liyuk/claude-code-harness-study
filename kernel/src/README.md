# Kernel Source

首个可运行垂直切片在 `kernel.ts`：它把 `policy_gate`、`tool_broker` 和内存 `event_store` 放在一个小实现中，证明核心合同后再拆分模块。

`file-system-executor.ts` 是第一个真实 I/O adapter。它把 root 解析为固定 workspace，拒绝越界和 symbolic link 路径；`read_file` 读取 UTF-8 文件，`write_file` 只暂存内容并返回统一 diff，绝不直接落盘。

运行演示：

```bash
npm run demo
```

它不会写入真实文件；executor 只是受控模拟器。`demo.ts` 展示写入请求先进入 `APPROVAL_REQUIRED`，随后经人工批准才执行。
