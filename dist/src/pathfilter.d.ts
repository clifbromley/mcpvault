import type { PathFilterConfig } from "./types.js";
export declare class PathFilter {
    private ignoredPatterns;
    private allowedExtensions;
    constructor(config?: Partial<PathFilterConfig>);
    private simpleGlobMatch;
    isAllowedFilePath(path: string): boolean;
    isAllowedForListing(path: string): boolean;
    private isIgnoredPath;
    filterPaths(paths: string[]): string[];
}
//# sourceMappingURL=pathfilter.d.ts.map