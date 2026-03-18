/**
 * Nano Banana Component Generator
 * Automatically generates React components based on design system and theme
 */
interface ComponentGeneratorConfig {
    componentName: string;
    componentType: 'form' | 'card' | 'button' | 'input' | 'modal' | 'table' | 'list';
    theme: {
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        fontFamily: string;
        borderRadius: string;
    };
    properties?: Record<string, any>;
}
interface GeneratedComponent {
    name: string;
    code: string;
    styles: string;
    props: Record<string, string>;
}
export declare class NanoBananaComponentGenerator {
    /**
     * Generate a form component based on theme
     */
    static generateFormComponent(config: ComponentGeneratorConfig): GeneratedComponent;
    /**
     * Generate a card component
     */
    static generateCardComponent(config: ComponentGeneratorConfig): GeneratedComponent;
    /**
     * Generate a button component
     */
    static generateButtonComponent(config: ComponentGeneratorConfig): GeneratedComponent;
    /**
     * Helper function to convert hex to RGB
     */
    private static hexToRgb;
    /**
     * Generate multiple components for a SaaS
     */
    static generateComponentLibrary(theme: ComponentGeneratorConfig['theme'], components: Array<{
        name: string;
        type: string;
    }>): GeneratedComponent[];
}
export type { GeneratedComponent, ComponentGeneratorConfig };
//# sourceMappingURL=component-generator.d.ts.map