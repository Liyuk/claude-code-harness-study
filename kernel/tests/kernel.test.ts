import assert from "node:assert/strict";
import test from "node:test";

import { Kernel, type ToolRequest } from "../src/kernel.ts";

const writeRequest: ToolRequest = {
  requestId: "request-write",
  tool: "write_file",
  input: { path: "src/app.ts", content: "export const ready = true;" },
  reason: "implement the requested change",
};

test("denies an ungranted capability before the executor receives the request", async () => {
  let executorCalls = 0;
  const kernel = new Kernel({
    capabilities: ["read:workspace/**"],
    budget: { toolCalls: 2 },
    executor: async () => {
      executorCalls += 1;
      return { status: "SUCCEEDED", output: "should not run" };
    },
  });

  const result = await kernel.dispatch(writeRequest);

  assert.equal(result.kind, "DENIED");
  assert.equal(result.code, "CAPABILITY_DENIED");
  assert.equal(executorCalls, 0);
  assert.deepEqual(kernel.events.map((event) => event.kind), ["TOOL_REQUESTED", "TOOL_DENIED"]);
});

test("holds an approval-required request until a human approval is supplied", async () => {
  let executorCalls = 0;
  const kernel = new Kernel({
    capabilities: ["write:workspace/src/**"],
    budget: { toolCalls: 2 },
    approvalRequiredFor: ["write_file"],
    executor: async () => {
      executorCalls += 1;
      return { status: "SUCCEEDED", output: "file written" };
    },
  });

  const pending = await kernel.dispatch(writeRequest);
  assert.deepEqual(pending, { kind: "APPROVAL_REQUIRED", requestId: "request-write" });
  assert.equal(executorCalls, 0);

  const completed = await kernel.approve("request-write");
  assert.deepEqual(completed, { kind: "COMPLETED", requestId: "request-write", output: "file written" });
  assert.equal(executorCalls, 1);
});

test("enforces the tool-call budget even when the capability is granted", async () => {
  const request: ToolRequest = {
    requestId: "request-read",
    tool: "read_file",
    input: { path: "src/app.ts" },
    reason: "inspect the implementation",
  };
  const kernel = new Kernel({
    capabilities: ["read:workspace/**"],
    budget: { toolCalls: 1 },
    executor: async () => ({ status: "SUCCEEDED", output: "contents" }),
  });

  const first = await kernel.dispatch(request);
  const second = await kernel.dispatch({ ...request, requestId: "request-read-again" });

  assert.equal(first.kind, "COMPLETED");
  assert.deepEqual(second, {
    kind: "DENIED",
    requestId: "request-read-again",
    code: "BUDGET_EXHAUSTED",
  });
});

test("rejects a workspace path that attempts to escape the sandbox", async () => {
  let executorCalls = 0;
  const kernel = new Kernel({
    capabilities: ["read:workspace/**"],
    budget: { toolCalls: 1 },
    executor: async () => {
      executorCalls += 1;
      return { status: "SUCCEEDED", output: "should not run" };
    },
  });

  const result = await kernel.dispatch({
    requestId: "request-escape",
    tool: "read_file",
    input: { path: "../.env" },
    reason: "read a secret",
  });

  assert.deepEqual(result, {
    kind: "DENIED",
    requestId: "request-escape",
    code: "INVALID_REQUEST",
  });
  assert.equal(executorCalls, 0);
});

test("records executor failures as execution failures rather than request validation errors", async () => {
  const kernel = new Kernel({
    capabilities: ["read:workspace/**"],
    budget: { toolCalls: 1 },
    executor: async () => ({ status: "FAILED", output: "test command exited 1" }),
  });

  const result = await kernel.dispatch({
    requestId: "request-failed-tool",
    tool: "read_file",
    input: { path: "src/app.ts" },
    reason: "inspect the implementation",
  });

  assert.deepEqual(result, {
    kind: "DENIED",
    requestId: "request-failed-tool",
    code: "EXECUTION_FAILED",
  });
});
