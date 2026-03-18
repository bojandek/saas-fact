/**
 * LLM Client — Centralni wrapper za sve AI pozive u SaaS Factory
 *
 * Primarni provider: Anthropic Claude (claude-sonnet-4-5 / claude-opus-4-5)
 * Fallback provider: OpenAI (za embeddings — Claude nema embedding API)
 *
 * Sve AI pozive u sistemu treba raditi kroz ovaj wrapper, nikad direktno
 * kroz `new OpenAI()` ili `new Anthropic()`.
 */
export declare const CLAUDE_MODELS: {
    /** Najbrži i najjeftiniji — za kratke zadatke, klasifikaciju, ekstrakciju */
    readonly HAIKU: "claude-haiku-4-5";
    /** Balans brzine i kvaliteta — default za većinu agenata */
    readonly SONNET: "claude-sonnet-4-5";
    /** Najmoćniji — za kompleksne arhitekturalne odluke */
    readonly OPUS: "claude-opus-4-5";
};
export type ClaudeModel = typeof CLAUDE_MODELS[keyof typeof CLAUDE_MODELS];
export interface LLMMessage {
    role: 'user' | 'assistant';
    content: string;
}
export interface LLMRequest {
    /** System prompt */
    system?: string;
    /** Poruke u konverzaciji */
    messages: LLMMessage[];
    /** Model (Claude ili OpenAI naziv — automatski se mapira) */
    model?: ClaudeModel | string;
    /** Max tokens u odgovoru */
    maxTokens?: number;
    /** Temperature (0-1) */
    temperature?: number;
    /** Ako je true, vraća stream umjesto kompletnog odgovora */
    stream?: false;
}
export interface LLMResponse {
    /** Tekst odgovora */
    content: string;
    /** Korišćeni model */
    model: string;
    /** Token usage */
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    /** Razlog zaustavljanja */
    stopReason: string;
}
export declare class LLMClient {
    private anthropic;
    private defaultModel;
    constructor(options?: {
        apiKey?: string;
        defaultModel?: ClaudeModel;
    });
    /**
     * Mapira OpenAI model naziv na odgovarajući Claude model.
     * Ako je već Claude model, vraća ga nepromijenjenog.
     */
    private resolveModel;
    /**
     * Šalje poruku Claude API-ju i vraća kompletan odgovor.
     */
    chat(request: LLMRequest): Promise<LLMResponse>;
    /**
     * Konveniencija metoda — šalje jedan user prompt sa system promptom.
     * Ekvivalent OpenAI `chat.completions.create` sa jednom porukom.
     */
    complete(options: {
        system?: string;
        prompt: string;
        model?: ClaudeModel | string;
        maxTokens?: number;
    }): Promise<string>;
    /**
     * JSON mode — garantuje da odgovor bude validan JSON.
     * Dodaje instrukcije u system prompt i parsira odgovor.
     */
    completeJSON<T = unknown>(options: {
        system?: string;
        prompt: string;
        model?: ClaudeModel | string;
        maxTokens?: number;
    }): Promise<T>;
}
/**
 * Vraća singleton LLM klijent.
 * Koristi ANTHROPIC_API_KEY iz environment varijabli.
 */
export declare function getLLMClient(): LLMClient;
/**
 * Brza konveniencija funkcija za jednostavne pozive.
 * Ekvivalent: getLLMClient().complete(options)
 */
export declare function llm(options: {
    system?: string;
    prompt: string;
    model?: ClaudeModel | string;
    maxTokens?: number;
}): Promise<string>;
/**
 * Brza konveniencija funkcija za JSON odgovore.
 */
export declare function llmJSON<T = unknown>(options: {
    system?: string;
    prompt: string;
    model?: ClaudeModel | string;
    maxTokens?: number;
}): Promise<T>;
//# sourceMappingURL=client.d.ts.map