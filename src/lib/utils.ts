import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitize HTML content by removing script tags and dangerous event handlers.
 * This prevents React's "Encountered a script tag" warning and XSS attacks
 * when using dangerouslySetInnerHTML.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return html
    // Remove <script> tags and their content (handles multi-line, attributes, and unclosed tags)
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    // Remove unclosed <script> tags (no closing tag)
    .replace(/<script\b[^>]*>[\s\S]*$/gi, '')
    // Remove self-closing <script /> tags
    .replace(/<script\b[^>]*\/>/gi, '')
    // Remove on* event handler attributes (onclick, onload, onerror, etc.)
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Remove javascript: URLs
    .replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, 'href="#"')
    // Remove <iframe> tags
    .replace(/<iframe\b[\s\S]*?<\/iframe\s*>/gi, '')
    // Remove <object> and <embed> tags
    .replace(/<object\b[\s\S]*?<\/object\s*>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    // Remove <noscript> tags (may contain script-like content)
    .replace(/<noscript\b[\s\S]*?<\/noscript\s*>/gi, '')
    // Remove <link> tags (could load external scripts)
    .replace(/<link\b[^>]*>/gi, '')
    // Remove <meta> tags with http-equiv="refresh" (could redirect)
    .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '');
}
