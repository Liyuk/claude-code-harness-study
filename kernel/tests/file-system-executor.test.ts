import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createFileSystemExecutor } from "../src/file-system-executor.ts";
import { Kernel } from "../src/kernel.ts";

async function withWorkspace(run: (workspace: string) => Promise<void>): Promise<void> {
  const workspace = await mkdtemp(join(tmpdir(), "ai-os-kernel-"));
  try {
    await run(workspace);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

test("reads a UTF-8 file inside its workspace", async () => {
  await withWorkspace(async (workspace) => {
    await writeFile(join(workspace, "notes.txt"), "kernel notes\n", "utf8");
    const executor = await createFileSystemExecutor(workspace);

    const result = await executor.execute({
      requestId: "read-notes",
      tool: "read_file",
      input: { path: "notes.txt" },
      reason: "inspect notes",
    });

    assert.deepEqual(result, { status: "SUCCEEDED", output: "kernel notes\n" });
  });
});

test("rejects a path that resolves outside its workspace", async () => {
  await withWorkspace(async (workspace) => {
    const executor = await createFileSystemExecutor(workspace);

    const result = await executor.execute({
      requestId: "read-outside",
      tool: "read_file",
      input: { path: "../outside.txt" },
      reason: "attempt to escape",
    });

    assert.equal(result.status, "FAILED");
    assert.match(result.output, /outside workspace/);
  });
});

test("stages an approved write as a diff without changing the workspace file", async () => {
  await withWorkspace(async (workspace) => {
    const file = join(workspace, "app.ts");
    await writeFile(file, "export const version = 1;\n", "utf8");
    const executor = await createFileSystemExecutor(workspace);
    const kernel = new Kernel({
      capabilities: ["write:workspace/**"],
      budget: { toolCalls: 1 },
      approvalRequiredFor: ["write_file"],
      executor: executor.execute,
    });

    const pending = await kernel.dispatch({
      requestId: "stage-write",
      tool: "write_file",
      input: { path: "app.ts", content: "export const version = 2;\n" },
      reason: "bump version",
    });
    const result = await kernel.approve("stage-write");

    assert.deepEqual(pending, { kind: "APPROVAL_REQUIRED", requestId: "stage-write" });
    assert.equal(result.kind, "COMPLETED");
    if (result.kind === "COMPLETED") {
      assert.match(result.output, /--- a\/app.ts/);
      assert.match(result.output, /\+\+\+ b\/app.ts/);
      assert.match(result.output, /-export const version = 1;/);
      assert.match(result.output, /\+export const version = 2;/);
    }
    assert.equal(await readFile(file, "utf8"), "export const version = 1;\n");
  });
});
