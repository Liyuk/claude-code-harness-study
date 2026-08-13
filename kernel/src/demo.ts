import { Kernel } from "./kernel.ts";

const kernel = new Kernel({
  capabilities: ["read:workspace/**", "write:workspace/src/**"],
  budget: { toolCalls: 2 },
  approvalRequiredFor: ["write_file"],
  executor: async (request) => ({
    status: "SUCCEEDED",
    output: `Simulated ${request.tool}: ${String(request.input.path)}`,
  }),
});

const request = {
  requestId: "demo-write",
  tool: "write_file",
  input: { path: "src/example.ts", content: "export const answer = 42;" },
  reason: "demonstrate a permission-gated write",
};

console.log(await kernel.dispatch(request));
console.log(await kernel.approve(request.requestId));
console.log(kernel.events);
