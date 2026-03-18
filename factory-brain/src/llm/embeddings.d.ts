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
export declare const EMBEDDING_MODELS: {
    readonly VOYAGE_LARGE: "voyage-3-large";
    readonly VOYAGE: "voyage-3";
    readonly VOYAGE_LITE: "voyage-3-lite";
    readonly VOYAGE_CODE: "voyage-code-3";
    readonly OPENAI_SMALL: "text-embedding-3-small";
    readonly OPENAI_LARGE: "text-embedding-3-large";
};
export type EmbeddingModel = typeof EMBEDDING_MODELS[keyof typeof EMBEDDING_MODELS];
export interface EmbeddingResult {
    embedding: number[];
    model: string;
    tokens: number;
}
/**
 * Kreira embedding vektor za dati tekst.
 * Koristi Voyage AI ako je VOYAGE_API_KEY postavljen,
 * inače fallback na OpenAI.
 */
export declare function createEmbedding(text: string, model?: EmbeddingModel): Promise<EmbeddingResult>;
/**
 * Batch embeddings — kreira embeddings za više tekstova odjednom.
 */
export declare function createEmbeddings(texts: string[], model?: EmbeddingModel): Promise<EmbeddingResult[]>;
//# sourceMappingURL=embeddings.d.ts.map