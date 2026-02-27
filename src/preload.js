/**
 * Preload script - runs in isolated context before renderer loads.
 * Kept minimal for security: no node APIs exposed to the web page.
 * contextIsolation + sandbox means the renderer cannot access Node.js or this file's
 * context unless we explicitly expose something (we do not).
 */
// Intentionally empty - dashboard runs entirely in the BrowserWindow loading vercel.com
