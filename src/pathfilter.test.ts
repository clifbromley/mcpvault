import { test, expect, describe } from "vitest";
import { PathFilter } from "./pathfilter.js";

describe("PathFilter", () => {
  // ============================================================================
  // BASIC FUNCTIONALITY
  // ============================================================================

  test("allows markdown files by default", () => {
    const filter = new PathFilter();
    expect(filter.isAllowedFilePath("notes/test.md")).toBe(true);
    expect(filter.isAllowedFilePath("test.markdown")).toBe(true);
    expect(filter.isAllowedFilePath("folder/subfolder/note.txt")).toBe(true);
  });

  test("blocks .obsidian directory", () => {
    const filter = new PathFilter();
    expect(filter.isAllowedFilePath(".obsidian")).toBe(false);
    expect(filter.isAllowedFilePath(".obsidian/app.json")).toBe(false);
    expect(filter.isAllowedFilePath(".obsidian/plugins/plugin/main.js")).toBe(false);
  });

  test("blocks .git directory", () => {
    const filter = new PathFilter();
    expect(filter.isAllowedFilePath(".git")).toBe(false);
    expect(filter.isAllowedFilePath(".git/config")).toBe(false);
    expect(filter.isAllowedFilePath(".git/objects/abc123")).toBe(false);
  });

  test("blocks node_modules", () => {
    const filter = new PathFilter();
    expect(filter.isAllowedFilePath("node_modules")).toBe(false);
    expect(filter.isAllowedFilePath("node_modules/package/index.js")).toBe(false);
  });

  test("blocks system files", () => {
    const filter = new PathFilter();
    expect(filter.isAllowedFilePath(".DS_Store")).toBe(false);
    expect(filter.isAllowedFilePath("Thumbs.db")).toBe(false);
  });

  test("blocks non-allowed extensions", () => {
    const filter = new PathFilter();
    expect(filter.isAllowedFilePath("script.js")).toBe(false);
    expect(filter.isAllowedFilePath("data.json")).toBe(false);
    expect(filter.isAllowedFilePath("image.png")).toBe(false);
  });

  test("allows non-note files for directory listing", () => {
    const filter = new PathFilter();
    expect(filter.isAllowedForListing("image.png")).toBe(true);
    expect(filter.isAllowedForListing("docs/report.pdf")).toBe(true);
    expect(filter.isAllowedForListing("archive/data.json")).toBe(true);
  });

  test("blocks restricted paths in directory listing", () => {
    const filter = new PathFilter();
    expect(filter.isAllowedForListing(".obsidian/app.json")).toBe(false);
    expect(filter.isAllowedForListing(".git/config")).toBe(false);
    expect(filter.isAllowedForListing("node_modules/pkg/index.js")).toBe(false);
    expect(filter.isAllowedForListing(".DS_Store")).toBe(false);
  });

  // ============================================================================
  // REGEX SPECIAL CHARACTERS - SECURITY TESTS
  // ============================================================================

  describe("regex special characters in paths", () => {
    test("handles dots in filenames literally", () => {
      const filter = new PathFilter();
      // Dots should be literal, not regex wildcards
      expect(filter.isAllowedFilePath("file.name.md")).toBe(true);
      expect(filter.isAllowedFilePath("v1.0.0-notes.md")).toBe(true);
    });

    test("handles parentheses in paths", () => {
      const filter = new PathFilter();
      expect(filter.isAllowedFilePath("notes/(archived)/old.md")).toBe(true);
      expect(filter.isAllowedFilePath("project (copy).md")).toBe(true);
    });

    test("handles square brackets in paths", () => {
      const filter = new PathFilter();
      expect(filter.isAllowedFilePath("notes/[2024]/january.md")).toBe(true);
      expect(filter.isAllowedFilePath("[inbox]/task.md")).toBe(true);
    });

    test("handles curly braces in paths", () => {
      const filter = new PathFilter();
      expect(filter.isAllowedFilePath("templates/{daily}.md")).toBe(true);
    });

    test("handles plus signs in paths", () => {
      const filter = new PathFilter();
      expect(filter.isAllowedFilePath("C++/notes.md")).toBe(true);
      expect(filter.isAllowedFilePath("topic+subtopic.md")).toBe(true);
    });

    test("handles question marks in paths", () => {
      const filter = new PathFilter();
      // Question mark is a glob wildcard, but in actual filenames should work
      expect(filter.isAllowedFilePath("FAQ?.md")).toBe(true);
    });

    test("handles asterisks in filenames", () => {
      const filter = new PathFilter();
      // Asterisk in filename (rare but valid on Unix)
      expect(filter.isAllowedFilePath("important*.md")).toBe(true);
      expect(filter.isAllowedFilePath("file*name.md")).toBe(true);
      expect(filter.isAllowedFilePath("notes/todo*.md")).toBe(true);
    });

    test("asterisk in custom ignored pattern works as glob", () => {
      const filter = new PathFilter({
        ignoredPatterns: ["temp*/**"]
      });
      // Pattern uses * as wildcard - should match temp, temp1, temporary, etc.
      expect(filter.isAllowedFilePath("temp/file.md")).toBe(false);
      expect(filter.isAllowedFilePath("temp1/file.md")).toBe(false);
      expect(filter.isAllowedFilePath("temporary/file.md")).toBe(false);
      // Should NOT match "atemp" (pattern starts with temp)
      expect(filter.isAllowedFilePath("atemp/file.md")).toBe(true);
    });

    test("double asterisk ** matches nested paths", () => {
      const filter = new PathFilter({
        ignoredPatterns: ["archive/**"]
      });
      expect(filter.isAllowedFilePath("archive/old.md")).toBe(false);
      expect(filter.isAllowedFilePath("archive/2024/jan/note.md")).toBe(false);
      expect(filter.isAllowedFilePath("other/archive/note.md")).toBe(true);
    });

    test("handles pipe character in paths", () => {
      const filter = new PathFilter();
      expect(filter.isAllowedFilePath("option|choice.md")).toBe(true);
    });

    test("handles caret in paths", () => {
      const filter = new PathFilter();
      expect(filter.isAllowedFilePath("version^2.md")).toBe(true);
    });

    test("handles dollar sign in paths", () => {
      const filter = new PathFilter();
      expect(filter.isAllowedFilePath("price$100.md")).toBe(true);
      expect(filter.isAllowedFilePath("$HOME/notes.md")).toBe(true);
    });

    test("handles backslash (Windows paths)", () => {
      const filter = new PathFilter();
      // Backslashes should be normalized to forward slashes
      expect(filter.isAllowedFilePath("folder\\subfolder\\note.md")).toBe(true);
    });
  });

  // ============================================================================
  // CUSTOM IGNORED PATTERNS WITH SPECIAL CHARS
  // ============================================================================

  describe("custom patterns with special characters", () => {
    test("custom pattern with dots is treated literally", () => {
      const filter = new PathFilter({
        ignoredPatterns: ["backup.2024/**"]
      });
      expect(filter.isAllowedFilePath("backup.2024/notes.md")).toBe(false);
      // "backup_2024" should NOT match "backup.2024" pattern
      expect(filter.isAllowedFilePath("backup_2024/notes.md")).toBe(true);
    });

    test("custom pattern with parentheses works", () => {
      const filter = new PathFilter({
        ignoredPatterns: ["(archive)/**"]
      });
      expect(filter.isAllowedFilePath("(archive)/old.md")).toBe(false);
      expect(filter.isAllowedFilePath("archive/old.md")).toBe(true);
    });

    test("custom pattern with brackets works", () => {
      const filter = new PathFilter({
        ignoredPatterns: ["[trash]/**"]
      });
      expect(filter.isAllowedFilePath("[trash]/deleted.md")).toBe(false);
      expect(filter.isAllowedFilePath("trash/deleted.md")).toBe(true);
    });
  });

  // ============================================================================
  // PATH TRAVERSAL ATTEMPTS
  // ============================================================================

  describe("path traversal prevention", () => {
    test("blocks obvious traversal patterns", () => {
      const filter = new PathFilter({
        ignoredPatterns: ["../**"]
      });
      expect(filter.isAllowedFilePath("../secret.md")).toBe(false);
      expect(filter.isAllowedFilePath("../../etc/passwd")).toBe(false);
    });

    test("handles encoded traversal attempts", () => {
      const filter = new PathFilter();
      // These should be allowed by PathFilter (path validation is in FileSystem)
      // but filter shouldn't crash on unusual characters
      expect(() => filter.isAllowedFilePath("%2e%2e/secret.md")).not.toThrow();
      expect(() => filter.isAllowedFilePath("..%2fnotes.md")).not.toThrow();
    });
  });

  test("allows Obsidian first-party file types", () => {
    const filter = new PathFilter();
    expect(filter.isAllowedFilePath("_Bases/daily-notes.base")).toBe(true);
    expect(filter.isAllowedFilePath("canvas/mindmap.canvas")).toBe(true);
  });

  // ============================================================================
  // FILTER PATHS BATCH OPERATION
  // ============================================================================

  describe("filterPaths", () => {
    test("filters array of paths correctly", () => {
      const filter = new PathFilter();
      const paths = [
        "notes/valid.md",
        ".obsidian/config.json",
        "archive/old.md",
        ".git/HEAD",
        "readme.txt"
      ];

      const allowed = filter.filterPaths(paths);
      expect(allowed).toEqual([
        "notes/valid.md",
        "archive/old.md",
        "readme.txt"
      ]);
    });

    test("handles empty array", () => {
      const filter = new PathFilter();
      expect(filter.filterPaths([])).toEqual([]);
    });

    test("handles array with all blocked paths", () => {
      const filter = new PathFilter();
      const paths = [
        ".obsidian/app.json",
        ".git/config",
        "node_modules/pkg/index.js"
      ];
      expect(filter.filterPaths(paths)).toEqual([]);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    test("handles empty path", () => {
      const filter = new PathFilter();
      expect(() => filter.isAllowedFilePath("")).not.toThrow();
    });

    test("handles path with only extension", () => {
      const filter = new PathFilter();
      expect(filter.isAllowedFilePath(".md")).toBe(true);
    });

    test("handles very long paths", () => {
      const filter = new PathFilter();
      const longPath = "a/".repeat(100) + "note.md";
      expect(() => filter.isAllowedFilePath(longPath)).not.toThrow();
      expect(filter.isAllowedFilePath(longPath)).toBe(true);
    });

    test("handles unicode characters in paths", () => {
      const filter = new PathFilter();
      expect(filter.isAllowedFilePath("notes/日本語.md")).toBe(true);
      expect(filter.isAllowedFilePath("émojis/🎉.md")).toBe(true);
      expect(filter.isAllowedFilePath("中文/笔记.md")).toBe(true);
    });

    test("handles spaces in paths", () => {
      const filter = new PathFilter();
      expect(filter.isAllowedFilePath("my notes/important file.md")).toBe(true);
    });

    test("blocks any path without a recognised extension", () => {
      const filter = new PathFilter();
      // Extension check is unconditional — no special-casing for trailing slashes
      // or Obsidian-style folder names. Anything without a recognised extension is blocked.
      expect(filter.isAllowedFilePath("folder/subfolder/")).toBe(false);
      expect(filter.isAllowedFilePath("notes")).toBe(false);
      expect(filter.isAllowedFilePath("1. Project")).toBe(false);
      expect(filter.isAllowedFilePath("2. Archive")).toBe(false);
      expect(filter.isAllowedFilePath("1. Project/subfolder")).toBe(false);
      expect(filter.isAllowedFilePath("file.with 1. extension")).toBe(false);
      // Files with recognised extensions inside those directories still work
      expect(filter.isAllowedFilePath("1. Project/note.md")).toBe(true);
      expect(filter.isAllowedFilePath("1. Project/file.js")).toBe(false);
    });

    test("blocks dotfiles and extension-less files (security: CVE-class bypass)", () => {
      const filter = new PathFilter();
      expect(filter.isAllowedFilePath(".env")).toBe(false);
      expect(filter.isAllowedFilePath(".netrc")).toBe(false);
      expect(filter.isAllowedFilePath("secrets")).toBe(false);
      expect(filter.isAllowedFilePath("Makefile")).toBe(false);
      expect(filter.isAllowedFilePath("subdir/.env")).toBe(false);
      expect(filter.isAllowedFilePath("project/credentials")).toBe(false);
    });
  });
});
