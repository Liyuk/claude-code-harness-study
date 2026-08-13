export type ToolRequest = {
  requestId: string;
  tool: string;
  input: Record<string, unknown>;
  reason: string;
};

export type ToolExecutionResult = {
  status: "SUCCEEDED" | "FAILED";
  output: string;
};

export type KernelEvent = {
  sequence: number;
  kind:
    | "TOOL_REQUESTED"
    | "TOOL_DENIED"
    | "TOOL_APPROVAL_REQUIRED"
    | "TOOL_APPROVED"
    | "TOOL_EXECUTED";
  requestId: string;
  detail?: string;
};

type Completed = { kind: "COMPLETED"; requestId: string; output: string };
type ApprovalRequired = { kind: "APPROVAL_REQUIRED"; requestId: string };
type Denied = {
  kind: "DENIED";
  requestId: string;
  code:
    | "CAPABILITY_DENIED"
    | "BUDGET_EXHAUSTED"
    | "INVALID_REQUEST"
    | "EXECUTION_FAILED";
};

export type DispatchResult = Completed | ApprovalRequired | Denied;

export type KernelConfig = {
  capabilities: readonly string[];
  budget: { toolCalls: number };
  approvalRequiredFor?: readonly string[];
  executor: (request: ToolRequest) => Promise<ToolExecutionResult>;
};

/**
 * A deterministic control plane around an untrusted agent. It is deliberately
 * small: all real-world side effects pass through dispatch() and approve().
 */
export class Kernel {
  readonly events: KernelEvent[] = [];
  private readonly pendingApprovals = new Map<string, ToolRequest>();
  private toolCallsUsed = 0;
  private readonly config: KernelConfig;

  constructor(config: KernelConfig) {
    this.config = config;
  }

  async dispatch(request: ToolRequest): Promise<DispatchResult> {
    this.record("TOOL_REQUESTED", request.requestId);

    const requiredCapability = capabilityFor(request);
    if (!requiredCapability) {
      return this.deny(request.requestId, "INVALID_REQUEST");
    }
    if (!this.config.capabilities.some((grant) => grants(grant, requiredCapability))) {
      return this.deny(request.requestId, "CAPABILITY_DENIED");
    }
    if (this.toolCallsUsed >= this.config.budget.toolCalls) {
      return this.deny(request.requestId, "BUDGET_EXHAUSTED");
    }
    if (this.config.approvalRequiredFor?.includes(request.tool)) {
      this.pendingApprovals.set(request.requestId, request);
      this.record("TOOL_APPROVAL_REQUIRED", request.requestId);
      return { kind: "APPROVAL_REQUIRED", requestId: request.requestId };
    }

    return this.execute(request);
  }

  async approve(requestId: string): Promise<DispatchResult> {
    const request = this.pendingApprovals.get(requestId);
    if (!request) {
      return this.deny(requestId, "INVALID_REQUEST");
    }
    if (this.toolCallsUsed >= this.config.budget.toolCalls) {
      this.pendingApprovals.delete(requestId);
      return this.deny(requestId, "BUDGET_EXHAUSTED");
    }

    this.pendingApprovals.delete(requestId);
    this.record("TOOL_APPROVED", requestId);
    return this.execute(request);
  }

  private async execute(request: ToolRequest): Promise<DispatchResult> {
    this.toolCallsUsed += 1;
    const result = await this.config.executor(request);
    this.record("TOOL_EXECUTED", request.requestId, result.status);

    if (result.status === "FAILED") {
      return this.deny(request.requestId, "EXECUTION_FAILED");
    }
    return { kind: "COMPLETED", requestId: request.requestId, output: result.output };
  }

  private deny(requestId: string, code: Denied["code"]): Denied {
    this.record("TOOL_DENIED", requestId, code);
    return { kind: "DENIED", requestId, code };
  }

  private record(event: KernelEvent["kind"], requestId: string, detail?: string): void {
    this.events.push({ sequence: this.events.length + 1, kind: event, requestId, detail });
  }
}

function capabilityFor(request: ToolRequest): string | undefined {
  const path = request.input.path;
  if (typeof path !== "string" || !isWorkspaceRelativePath(path)) {
    return undefined;
  }

  switch (request.tool) {
    case "read_file":
      return `read:workspace/${path}`;
    case "write_file":
      return `write:workspace/${path}`;
    default:
      return undefined;
  }
}

function isWorkspaceRelativePath(path: string): boolean {
  return path.length > 0 && !path.startsWith("/") && !path.split("/").includes("..");
}

function grants(grant: string, required: string): boolean {
  if (grant === required) {
    return true;
  }
  if (!grant.endsWith("/**")) {
    return false;
  }
  return required.startsWith(grant.slice(0, -2));
}
