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

  isAllowedFilePath(path: string): boolean {
    const normalizedPath = path.replace(/\\/g, '/');

    if (this.isIgnoredPath(normalizedPath)) {
      return false;
    }

    if (this.allowedExtensions.length > 0) {
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


  filterPaths(paths: string[]): string[] {
    return paths.filter(path => this.isAllowedFilePath(path));
  }
}
