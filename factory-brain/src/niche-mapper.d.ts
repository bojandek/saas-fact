/**
 * Niche-to-Blocks Mapping Engine
 *
 * Automatically selects the right blocks for a given niche/vertical.
 * This is the "brain" that turns `factory generate --niche "teretana-crm"`
 * into a concrete list of blocks, features and database tables.
 *
 * Usage:
 *   const mapper = new NicheMapper()
 *   const blueprint = await mapper.mapNiche('teretana-crm')
 *   // => { blocks: ['auth', 'payments', 'calendar', ...], tables: [...], features: [...] }
 */
export interface NicheBlueprint {
    niche: string;
    normalizedNiche: string;
    category: NicheCategory;
    blocks: string[];
    coreFeatures: string[];
    databaseTables: string[];
    suggestedAppName: string;
    suggestedTagline: string;
    pricingModel: 'subscription' | 'usage-based' | 'freemium' | 'one-time';
    targetPersona: string;
    estimatedComplexity: 'simple' | 'medium' | 'complex';
    confidence: number;
}
export type NicheCategory = 'fitness-wellness' | 'hospitality-booking' | 'ecommerce-retail' | 'professional-services' | 'education-learning' | 'healthcare' | 'real-estate' | 'finance-accounting' | 'hr-recruitment' | 'marketing-analytics' | 'project-management' | 'communication' | 'other';
export declare class NicheMapper {
    private llm;
    private log;
    constructor();
    /**
     * Maps a niche string to a full NicheBlueprint.
     * First checks static knowledge base, then falls back to LLM.
     */
    mapNiche(niche: string): Promise<NicheBlueprint>;
    /**
     * Normalize niche string: lowercase, replace spaces/underscores with hyphens
     */
    private normalizeNiche;
    /**
     * Find best match in static knowledge base using fuzzy matching
     */
    private findStaticMatch;
    /**
     * Build a complete NicheBlueprint from partial data
     */
    private buildBlueprint;
    /**
     * Use LLM to map unknown niches
     */
    private mapNicheWithLLM;
    private generateAppName;
    private generateTagline;
}
//# sourceMappingURL=niche-mapper.d.ts.map