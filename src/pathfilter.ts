import type { PathFilterConfig } from "./types.js";

export class PathFilter {
  private ignoredPatterns: string[];
  private allowedExtensions: string[];

  constructor(config?: Partial<PathFilterConfig>) {
    this.ignoredPatterns = [
      '.obsidian',
      '.obsidian/**',
      '.git',
      '.git/**',
      'node_modules',
      'node_modules/**',
      '.DS_Store',
      'Thumbs.db',
      ...config?.ignoredPatterns || []
    ];

    this.allowedExtensions = [
      '.md',
      '.markdown',
      '.txt',
      '.base',    // Obsidian Bases (YAML)
      '.canvas',  // Obsidian Canvas (JSON)
      ...config?.allowedExtensions || []
    ];
  }

  private simpleGlobMatch(pattern: string, path: string): boolean {
    // Normalize pattern path separators (Windows compatibility)
    const normalizedPattern = pattern.replace(/\\/g, '/');

    // Convert glob pattern to regex, escaping special regex chars first
    let regexPattern = normalizedPattern
      .replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')  // Escape all regex special chars
      .replace(/\\\*\\\*/g, '.*')  // ** matches any number of directories (unescape)
      .replace(/\\\*/g, '[^/]*')   // * matches anything except / (unescape)
      .replace(/\\\?/g, '[^/]');   // ? matches single character except / (unescape)

    // Ensure we match the full path
    regexPattern = '^' + regexPattern + '$';

    const regex = new RegExp(regexPattern);
    return regex.test(path);
  }

  isAllowed(path: string): boolean {
    // Normalize path separators
    const normalizedPath = path.replace(/\\/g, '/');

    if (this.isIgnoredPath(normalizedPath)) {
      return false;
    }

    // For files, check extension if allowedExtensions is configured
    if (this.allowedExtensions.length > 0 && this.isFile(normalizedPath)) {
      const hasAllowedExtension = this.allowedExtensions.some(ext =>
        normalizedPath.toLowerCase().endsWith(ext.toLowerCase())
      );
      if (!hasAllowedExtension) {
        return false;
      }
    }

    return true;
  }

  isAllowedForListing(path: string): boolean {
    // Normalize path separators
    const normalizedPath = path.replace(/\\/g, '/');

    // Listing includes non-note files, but still blocks restricted system paths
    return !this.isIgnoredPath(normalizedPath);
  }

  private isIgnoredPath(normalizedPath: string): boolean {

    // Check if path matches any ignored pattern
    for (const pattern of this.ignoredPatterns) {
      if (this.simpleGlobMatch(pattern, normalizedPath)) {
        return true;
      }
    }

    return false;
  }

  private isFile(path: string): boolean {
    // Determines whether a path should be subject to the extension allowlist.
    //
    // Explicit directory paths (trailing slash) are exempt. Everything else is
    // treated as a file unless the last component contains a dot that is neither
    // at position 0 nor followed by non-alphanumeric characters — which covers
    // Obsidian folder naming conventions like "1. Project" or "2.5 Notes".
    //
    // Dotfiles (.env, .netrc) and extension-less files (secrets, Makefile) are
    // intentionally treated as files so the extension allowlist blocks them.
    // Directory names that look like note files (e.g. dir.md) are classified as
    // files here, but filesystem.ts independently rejects them as directories.
    if (path.endsWith('/')) {
      return false;
    }

    const lastSlashIndex = path.lastIndexOf('/');
    const lastComponent = lastSlashIndex === -1 ? path : path.substring(lastSlashIndex + 1);

    const lastDotIndex = lastComponent.lastIndexOf('.');
    if (lastDotIndex === -1) return true;  // no dot at all: extension-less file
    if (lastDotIndex === 0)  return true;  // leading dot only: dotfile

    const extension = lastComponent.substring(lastDotIndex + 1);
    // A real extension is 1–10 alphanumeric characters (matches .md, .txt, .canvas).
    // A dot followed by spaces or punctuation (e.g. "1. Project") is not an extension.
    return extension.length >= 1 && extension.length <= 10 && /^[a-zA-Z0-9]+$/.test(extension);
  }

  filterPaths(paths: string[]): string[] {
    return paths.filter(path => this.isAllowed(path));
  }
}
