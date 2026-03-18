"use strict";
/**
 * Embeddings — Voyage AI kao primarni provider (Anthropic preporučuje)
 *
 * Anthropic Claude nema vlastiti embedding API.
 * Voyage AI je Anthropic-preporučeni embedding provider.
 * Fallback: OpenAI text-embedding-3-small (ako VOYAGE_API_KEY nije postavljen)
 *
 * Voyage AI modeli:
 *   - voyage-3-large  — 1024 dim, najkvalitetniji
 *   - voyage-3        — 1024 dim, balans
 *   - voyage-3-lite   — 512 dim, najbrži i najjeftiniji
 *   - voyage-code-3   — optimiziran za kod
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMBEDDING_MODELS = void 0;
exports.createEmbedding = createEmbedding;
exports.createEmbeddings = createEmbeddings;
const logger_1 = require("../utils/logger");
exports.EMBEDDING_MODELS = {
    VOYAGE_LARGE: 'voyage-3-large',
    VOYAGE: 'voyage-3',
    VOYAGE_LITE: 'voyage-3-lite',
    VOYAGE_CODE: 'voyage-code-3',
    // OpenAI fallback
    OPENAI_SMALL: 'text-embedding-3-small',
    OPENAI_LARGE: 'text-embedding-3-large',
};
/**
 * Kreira embedding vektor za dati tekst.
 * Koristi Voyage AI ako je VOYAGE_API_KEY postavljen,
 * inače fallback na OpenAI.
 */
async function createEmbedding(text, model = exports.EMBEDDING_MODELS.VOYAGE) {
    const voyageKey = process.env.VOYAGE_API_KEY;
    if (voyageKey && !model.startsWith('text-embedding')) {
        return createVoyageEmbedding(text, model, voyageKey);
    }
    // Fallback na OpenAI
    logger_1.logger.debug('[Embeddings] VOYAGE_API_KEY not set, falling back to OpenAI embeddings');
    return createOpenAIEmbedding(text, exports.EMBEDDING_MODELS.OPENAI_SMALL);
}
async function createVoyageEmbedding(text, model, apiKey) {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            input: text.slice(0, 32000), // Voyage limit
            model,
        }),
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`[Embeddings] Voyage API error: ${error}`);
    }
    const data = await response.json();
    return {
        embedding: data.data[0].embedding,
        model: data.model,
        tokens: data.usage.total_tokens,
    };
}
async function createOpenAIEmbedding(text, model) {
    // Dinamički import da ne zahtijeva openai paket ako se ne koristi
    const { default: OpenAI } = await Promise.resolve().then(() => __importStar(require('openai')));
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.embeddings.create({
        model,
        input: text.slice(0, 8000),
    });
    return {
        embedding: response.data[0].embedding,
        model: response.model,
        tokens: response.usage.total_tokens,
    };
}
/**
 * Batch embeddings — kreira embeddings za više tekstova odjednom.
 */
async function createEmbeddings(texts, model = exports.EMBEDDING_MODELS.VOYAGE) {
    const voyageKey = process.env.VOYAGE_API_KEY;
    if (voyageKey && !model.startsWith('text-embedding')) {
        const response = await fetch('https://api.voyageai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${voyageKey}`,
            },
            body: JSON.stringify({
                input: texts.map(t => t.slice(0, 32000)),
                model,
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`[Embeddings] Voyage batch API error: ${error}`);
        }
        const data = await response.json();
        return data.data
            .sort((a, b) => a.index - b.index)
            .map(item => ({
            embedding: item.embedding,
            model: data.model,
            tokens: Math.floor(data.usage.total_tokens / texts.length),
        }));
    }
    // Fallback: sekvencijalni OpenAI pozivi
    return Promise.all(texts.map(text => createOpenAIEmbedding(text, exports.EMBEDDING_MODELS.OPENAI_SMALL)));
}
//# sourceMappingURL=embeddings.js.map