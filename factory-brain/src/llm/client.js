"use strict";
/**
 * LLM Client — Centralni wrapper za sve AI pozive u SaaS Factory
 *
 * Primarni provider: Anthropic Claude (claude-sonnet-4-5 / claude-opus-4-5)
 * Fallback provider: OpenAI (za embeddings — Claude nema embedding API)
 *
 * Sve AI pozive u sistemu treba raditi kroz ovaj wrapper, nikad direktno
 * kroz `new OpenAI()` ili `new Anthropic()`.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMClient = exports.CLAUDE_MODELS = void 0;
exports.getLLMClient = getLLMClient;
exports.llm = llm;
exports.llmJSON = llmJSON;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const logger_1 = require("../utils/logger");
// ─── Model konstante ──────────────────────────────────────────────────────────
exports.CLAUDE_MODELS = {
    /** Najbrži i najjeftiniji — za kratke zadatke, klasifikaciju, ekstrakciju */
    HAIKU: 'claude-haiku-4-5',
    /** Balans brzine i kvaliteta — default za većinu agenata */
    SONNET: 'claude-sonnet-4-5',
    /** Najmoćniji — za kompleksne arhitekturalne odluke */
    OPUS: 'claude-opus-4-5',
};
// Mapping starih OpenAI modela na odgovarajuće Claude modele
const OPENAI_TO_CLAUDE_MAP = {
    'gpt-4o': exports.CLAUDE_MODELS.SONNET,
    'gpt-4o-mini': exports.CLAUDE_MODELS.HAIKU,
    'gpt-4.1-mini': exports.CLAUDE_MODELS.HAIKU,
    'gpt-4': exports.CLAUDE_MODELS.SONNET,
    'gpt-3.5-turbo': exports.CLAUDE_MODELS.HAIKU,
};
// ─── LLM Client klasa ─────────────────────────────────────────────────────────
class LLMClient {
    constructor(options) {
        this.anthropic = new sdk_1.default({
            apiKey: options?.apiKey ?? process.env.ANTHROPIC_API_KEY,
        });
        this.defaultModel = options?.defaultModel ?? exports.CLAUDE_MODELS.SONNET;
    }
    /**
     * Mapira OpenAI model naziv na odgovarajući Claude model.
     * Ako je već Claude model, vraća ga nepromijenjenog.
     */
    resolveModel(model) {
        if (!model)
            return this.defaultModel;
        if (Object.values(exports.CLAUDE_MODELS).includes(model)) {
            return model;
        }
        const mapped = OPENAI_TO_CLAUDE_MAP[model];
        if (mapped) {
            logger_1.logger.debug(`[LLMClient] Mapped OpenAI model '${model}' -> Claude '${mapped}'`);
            return mapped;
        }
        logger_1.logger.warn(`[LLMClient] Unknown model '${model}', using default: ${this.defaultModel}`);
        return this.defaultModel;
    }
    /**
     * Šalje poruku Claude API-ju i vraća kompletan odgovor.
     */
    async chat(request) {
        const model = this.resolveModel(request.model);
        const maxTokens = request.maxTokens ?? 4096;
        logger_1.logger.debug(`[LLMClient] Calling Claude ${model} (maxTokens: ${maxTokens})`);
        const response = await this.anthropic.messages.create({
            model,
            max_tokens: maxTokens,
            system: request.system,
            messages: request.messages.map(m => ({
                role: m.role,
                content: m.content,
            })),
            ...(request.temperature !== undefined && {
            // Claude ne podržava temperature direktno u messages.create,
            // ali podržava kroz extended thinking — za sad ignorišemo
            }),
        });
        const content = response.content
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('');
        return {
            content,
            model: response.model,
            usage: {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens,
                totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            },
            stopReason: response.stop_reason ?? 'end_turn',
        };
    }
    /**
     * Konveniencija metoda — šalje jedan user prompt sa system promptom.
     * Ekvivalent OpenAI `chat.completions.create` sa jednom porukom.
     */
    async complete(options) {
        const response = await this.chat({
            system: options.system,
            messages: [{ role: 'user', content: options.prompt }],
            model: options.model,
            maxTokens: options.maxTokens,
        });
        return response.content;
    }
    /**
     * JSON mode — garantuje da odgovor bude validan JSON.
     * Dodaje instrukcije u system prompt i parsira odgovor.
     */
    async completeJSON(options) {
        const systemWithJSON = [
            options.system,
            'IMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no explanation. Just the raw JSON object.',
        ]
            .filter(Boolean)
            .join('\n\n');
        const raw = await this.complete({
            ...options,
            system: systemWithJSON,
        });
        // Pokušaj parsiranja — ukloni eventualne markdown code blokove
        const cleaned = raw
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
        try {
            return JSON.parse(cleaned);
        }
        catch {
            // Drugi pokušaj — nađi prvi { ili [ i parsiraj od tamo
            const jsonStart = cleaned.search(/[{[]/);
            if (jsonStart !== -1) {
                return JSON.parse(cleaned.slice(jsonStart));
            }
            throw new Error(`[LLMClient] Failed to parse JSON response: ${cleaned.slice(0, 200)}`);
        }
    }
}
exports.LLMClient = LLMClient;
// ─── Singleton instanca ───────────────────────────────────────────────────────
let _client = null;
/**
 * Vraća singleton LLM klijent.
 * Koristi ANTHROPIC_API_KEY iz environment varijabli.
 */
function getLLMClient() {
    if (!_client) {
        _client = new LLMClient();
    }
    return _client;
}
/**
 * Brza konveniencija funkcija za jednostavne pozive.
 * Ekvivalent: getLLMClient().complete(options)
 */
async function llm(options) {
    return getLLMClient().complete(options);
}
/**
 * Brza konveniencija funkcija za JSON odgovore.
 */
async function llmJSON(options) {
    return getLLMClient().completeJSON(options);
}
//# sourceMappingURL=client.js.map