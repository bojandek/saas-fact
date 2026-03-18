"use strict";
/**
 * Memory system for Factory Brain
 * Tracks projects, lessons, patterns, and preferences
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemorySystem = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
class MemorySystem {
    constructor() {
        this.supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');
    }
    /**
     * Record project completion
     */
    async recordProject(project) {
        const { error } = await this.supabase
            .from('projects')
            .insert({
            name: project.name,
            description: project.description,
            tech_stack: project.tech_stack,
            lessons: project.lessons,
            metrics: project.metrics,
        });
        if (error)
            throw error;
    }
    /**
     * Add learned lesson
     */
    async addLesson(lesson) {
        const { error } = await this.supabase
            .from('lessons')
            .insert({
            title: lesson.title,
            description: lesson.description,
            category: lesson.category,
            solution: lesson.solution,
            projects: lesson.projects,
        });
        if (error)
            throw error;
    }
    /**
     * Track pattern effectiveness
     */
    async recordPattern(pattern) {
        const { error } = await this.supabase
            .from('patterns')
            .insert({
            name: pattern.name,
            description: pattern.description,
            use_cases: pattern.use_cases,
            effectiveness: pattern.effectiveness,
        });
        if (error)
            throw error;
    }
    /**
     * Get most effective patterns
     */
    async getTopPatterns(limit = 10) {
        const { data, error } = await this.supabase
            .from('patterns')
            .select('*')
            .order('effectiveness', { ascending: false })
            .limit(limit);
        if (error)
            throw error;
        return data;
    }
    /**
     * Get lessons by category
     */
    async getLessonsByCategory(category) {
        const { data, error } = await this.supabase
            .from('lessons')
            .select('*')
            .eq('category', category)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data;
    }
}
exports.MemorySystem = MemorySystem;
//# sourceMappingURL=memory.js.map