import validator from 'validator';
import escapeHtml from 'escape-html';

/**
 * Sanitizes user input to prevent XSS attacks and other injection vulnerabilities
 */
export class InputSanitizer {
  
  /**
   * Sanitize text input by escaping HTML and normalizing whitespace
   */
  static sanitizeText(input: string, maxLength: number = 1000): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // Trim whitespace and limit length
    let sanitized = input.trim().substring(0, maxLength);
    
    // Escape HTML to prevent XSS
    sanitized = escapeHtml(sanitized);
    
    // Remove control characters except newlines and tabs
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    return sanitized;
  }
  
  /**
   * Sanitize and validate email input
   */
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return '';
    }
    
    // Normalize email to lowercase and trim
    let sanitized = email.trim().toLowerCase();
    
    // Remove potentially dangerous characters (keep only email-safe chars)
    sanitized = sanitized.replace(/[^a-zA-Z0-9@._+-]/g, '');
    
    return sanitized;
  }
  
  /**
   * Sanitize task title with strict limits
   */
  static sanitizeTaskTitle(title: string): string {
    return this.sanitizeText(title, 200);
  }
  
  /**
   * Sanitize user name 
   */
  static sanitizeUserName(name: string): string {
    if (!name || typeof name !== 'string') {
      return '';
    }
    
    // Trim and limit length
    let sanitized = name.trim().substring(0, 100);
    
    // Escape HTML 
    sanitized = escapeHtml(sanitized);
    
    // Allow only letters, numbers, spaces, and basic punctuation
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s\.\-']/g, '');
    
    // Normalize multiple spaces to single space
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    return sanitized;
  }
  
  /**
   * Sanitize app package names for mobile enforcement
   */
  static sanitizePackageName(packageName: string): string {
    if (!packageName || typeof packageName !== 'string') {
      return '';
    }
    
    // Package names should only contain letters, numbers, dots, and underscores
    return packageName.trim().replace(/[^a-zA-Z0-9._]/g, '');
  }
  
  /**
   * Sanitize array of strings (like targetApps)
   */
  static sanitizeStringArray(arr: any[]): string[] {
    if (!Array.isArray(arr)) {
      return [];
    }
    
    return arr
      .filter(item => typeof item === 'string' && item.trim())
      .map(item => this.sanitizeText(item, 100))
      .filter(item => item.length > 0);
  }
  
  /**
   * Sanitize file paths/URLs to prevent path traversal
   */
  static sanitizeFilePath(filePath: string): string {
    if (!filePath || typeof filePath !== 'string') {
      return '';
    }
    
    // Remove path traversal attempts
    let sanitized = filePath.replace(/\.\./g, '');
    
    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Normalize slashes
    sanitized = sanitized.replace(/\\/g, '/');
    
    return sanitized;
  }
}