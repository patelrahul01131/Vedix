import * as path from 'path';

/**
 * Validates that a user-supplied file path resolves to a location
 * strictly inside the workspace root. Prevents path traversal attacks
 * like `../../../../etc/passwd`.
 *
 * @param workspaceRoot  Absolute path to the workspace root directory
 * @param filePath       User-supplied (possibly relative) path
 * @returns { safe, resolvedPath }
 */
export function validateWorkspacePath(
  workspaceRoot: string,
  filePath: string
): { safe: boolean; resolvedPath: string } {
  const safeRoot = path.resolve(workspaceRoot);
  const resolvedPath = path.resolve(safeRoot, filePath);

  // Allow exactly the root dir, or anything strictly inside it
  const safe =
    resolvedPath === safeRoot ||
    resolvedPath.startsWith(safeRoot + path.sep);

  return { safe, resolvedPath };
}
