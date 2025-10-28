/**
 * Sanitizes user input to prevent XSS attacks and other injection vulnerabilities
 */
export declare class InputSanitizer {
    /**
     * Sanitize text input by escaping HTML and normalizing whitespace
     */
    static sanitizeText(input: string, maxLength?: number): string;
    /**
     * Sanitize and validate email input
     */
    static sanitizeEmail(email: string): string;
    /**
     * Sanitize task title with strict limits
     */
    static sanitizeTaskTitle(title: string): string;
    /**
     * Sanitize user name
     */
    static sanitizeUserName(name: string): string;
    /**
     * Sanitize app package names for mobile enforcement
     */
    static sanitizePackageName(packageName: string): string;
    /**
     * Sanitize array of strings (like targetApps)
     */
    static sanitizeStringArray(arr: any[]): string[];
    /**
     * Sanitize file paths/URLs to prevent path traversal
     */
    static sanitizeFilePath(filePath: string): string;
}
//# sourceMappingURL=sanitization.d.ts.map