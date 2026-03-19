"use strict";
/**
 * Factory Brain - AI-powered SaaS development system
 * Combines knowledge, memory, and agents for rapid SaaS creation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignAgent = exports.CodeReviewAgent = exports.ArchitectAgent = exports.MemorySystem = exports.RAGSystem = void 0;
exports.initFactoryBrain = initFactoryBrain;
var rag_1 = require("./rag");
Object.defineProperty(exports, "RAGSystem", { enumerable: true, get: function () { return rag_1.RAGSystem; } });
var memory_1 = require("./memory");
Object.defineProperty(exports, "MemorySystem", { enumerable: true, get: function () { return memory_1.MemorySystem; } });
var agents_1 = require("./agents");
Object.defineProperty(exports, "ArchitectAgent", { enumerable: true, get: function () { return agents_1.ArchitectAgent; } });
Object.defineProperty(exports, "CodeReviewAgent", { enumerable: true, get: function () { return agents_1.CodeReviewAgent; } });
Object.defineProperty(exports, "DesignAgent", { enumerable: true, get: function () { return agents_1.DesignAgent; } });
/**
 * Initialize Factory Brain system (call once at app startup)
 */
function initFactoryBrain() {
    // Validate required env vars at startup
    const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'ANTHROPIC_API_KEY'];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Factory Brain: Missing env vars: ${missing.join(', ')}`);
    }
    return { status: 'ready', systems: ['rag', 'memory', 'agents'] };
}
//# sourceMappingURL=index.js.map