"use strict";
/**
 * Shared types for the Always-On Memory System.
 *
 * Architecture inspired by Google's Always-On Memory Agent (ADK):
 * https://github.com/GoogleCloudPlatform/generative-ai/tree/main/gemini/agents/always-on-memory-agent
 *
 * Adapted for TypeScript with Supabase + OpenAI instead of SQLite + Gemini.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_SUPPORTED_EXTENSIONS = exports.SUPPORTED_MEDIA_EXTENSIONS = exports.SUPPORTED_TEXT_EXTENSIONS = void 0;
exports.SUPPORTED_TEXT_EXTENSIONS = new Set([
    '.txt', '.md', '.json', '.csv', '.log', '.xml', '.yaml', '.yml', '.ts', '.js', '.py',
]);
exports.SUPPORTED_MEDIA_EXTENSIONS = {
    // Images
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    // Audio
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
    // Video
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    // Documents
    '.pdf': 'application/pdf',
};
exports.ALL_SUPPORTED_EXTENSIONS = new Set([
    ...exports.SUPPORTED_TEXT_EXTENSIONS,
    ...Object.keys(exports.SUPPORTED_MEDIA_EXTENSIONS),
]);
//# sourceMappingURL=types.js.map