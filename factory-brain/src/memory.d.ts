/**
 * Memory system for Factory Brain
 * Tracks projects, lessons, patterns, and preferences
 */
interface ProjectMemory {
    id: string;
    name: string;
    description: string;
    tech_stack: string[];
    lessons: string[];
    metrics: Record<string, any>;
    created_at: string;
    updated_at: string;
}
interface Lesson {
    id: string;
    title: string;
    description: string;
    category: 'bug' | 'architecture' | 'performance' | 'ux' | 'other';
    solution: string;
    projects: string[];
    created_at: string;
}
interface Pattern {
    id: string;
    name: string;
    description: string;
    use_cases: string[];
    effectiveness: number;
    frequency_used: number;
}
export declare class MemorySystem {
    private supabase;
    constructor();
    /**
     * Record project completion
     */
    recordProject(project: ProjectMemory): Promise<void>;
    /**
     * Add learned lesson
     */
    addLesson(lesson: Lesson): Promise<void>;
    /**
     * Track pattern effectiveness
     */
    recordPattern(pattern: Pattern): Promise<void>;
    /**
     * Get most effective patterns
     */
    getTopPatterns(limit?: number): Promise<Pattern[]>;
    /**
     * Get lessons by category
     */
    getLessonsByCategory(category: string): Promise<Lesson[]>;
}
export type { ProjectMemory, Lesson, Pattern };
//# sourceMappingURL=memory.d.ts.map