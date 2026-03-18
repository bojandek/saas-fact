interface AssemblerInput {
    appName: string;
    saasDescription: string;
    theme: {
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        fontFamily: string;
        borderRadius: string;
    };
    blueprint: {
        sqlSchema: string;
        apiSpec: string;
        rlsPolicies: string;
    };
}
export declare class AssemblerAgent {
    private baseAppPath;
    private appsDir;
    private knowledgeExtractorAgent;
    constructor();
    private copyBaseApp;
    private applyTheme;
    private applySqlSchema;
    private applyRlsPolicies;
    private generateAndSaveComponents;
    assemble(input: AssemblerInput): Promise<string>;
}
export {};
//# sourceMappingURL=assembler-agent.d.ts.map