import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import type { ToolExecutionResult, ToolRequest } from "./kernel.ts";

export type FileSystemExecutor = {
  execute(request: ToolRequest): Promise<ToolExecutionResult>;
};

/**
 * Creates a workspace-confined adapter. Writes are staged in memory and never
 * reach disk; a later explicit apply operation will own that side effect.
 */
export async function createFileSystemExecutor(workspaceRoot: string): Promise<FileSystemExecutor> {
  const root = await realpath(workspaceRoot);
  const stagedContent = new Map<string, string>();

  return {
    async execute(request: ToolRequest): Promise<ToolExecutionResult> {
      try {
        const path = requestPath(request);
        const target = await resolveWorkspacePath(root, path);

        switch (request.tool) {
          case "read_file":
            return {
              status: "SUCCEEDED",
              output: stagedContent.get(path) ?? (await readFile(target, "utf8")),
            };
          case "write_file": {
            const content = request.input.content;
            if (typeof content !== "string") {
              return failed("write_file requires a string content field");
            }
            const before = stagedContent.get(path) ?? (await readExistingFile(target));
            stagedContent.set(path, content);
            return { status: "SUCCEEDED", output: unifiedDiff(path, before, content) };
          }
          default:
            return failed(`unsupported tool: ${request.tool}`);
        }
      } catch (error) {
        return failed(errorMessage(error));
      }
    },
  };
}

function requestPath(request: ToolRequest): string {
  const path = request.input.path;
  if (typeof path !== "string" || path.length === 0 || path.includes("\0")) {
    throw new Error("path must be a non-empty relative string");
  }
  return path;
}

async function resolveWorkspacePath(root: string, requestedPath: string): Promise<string> {
  const target = resolve(root, requestedPath);
  const workspaceRelativePath = relative(root, target);
  if (
    workspaceRelativePath.length === 0 ||
    workspaceRelativePath === ".." ||
    workspaceRelativePath.startsWith(`..${sep}`) ||
    isAbsolute(workspaceRelativePath)
  ) {
    throw new Error("path resolves outside workspace");
  }
  await rejectSymbolicLinks(root, workspaceRelativePath);
  return target;
}

async function rejectSymbolicLinks(root: string, workspaceRelativePath: string): Promise<void> {
  let current = root;
  for (const segment of workspaceRelativePath.split(sep)) {
    current = resolve(current, segment);
    try {
      if ((await lstat(current)).isSymbolicLink()) {
        throw new Error("symbolic links are not allowed in workspace paths");
      }
    } catch (error) {
      if (isMissingPath(error)) {
        return;
      }
      throw error;
    }
  }
}

async function readExistingFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (isMissingPath(error)) {
      return "";
    }
    throw error;
  }
}

function unifiedDiff(path: string, before: string, after: string): string {
  const remove = before.length === 0 ? [] : before.split("\n").filter((line, index, lines) => !(index === lines.length - 1 && line === ""));
  const add = after.length === 0 ? [] : after.split("\n").filter((line, index, lines) => !(index === lines.length - 1 && line === ""));
  return [`--- a/${path}`, `+++ b/${path}`, "@@", ...remove.map((line) => `-${line}`), ...add.map((line) => `+${line}`)].join("\n");
}

function isMissingPath(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function failed(message: string): ToolExecutionResult {
  return { status: "FAILED", output: message };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
