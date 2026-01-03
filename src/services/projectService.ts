import { supabase } from './supabaseClient';
import type { Project, GreenFix } from '../types/database';

export interface CreateProjectInput {
    street_name: string;
    screenshot: string | null;
    features: GreenFix[];
    total_area: number;
    total_reduction: number;
}

async function getUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
}

/**
 * Project service for Supabase CRUD operations
 */
export const projectService = {
    /**
     * Create a new project
     */
    async create(input: CreateProjectInput): Promise<{ data: Project | null; error: Error | null }> {
        const userId = await getUserId();
        if (!userId) return { data: null, error: new Error('User not authenticated') };

        const { data, error } = await supabase
            .from('projects')
            .insert({
                user_id: userId,
                street_name: input.street_name,
                screenshot: input.screenshot,
                features: input.features,
                total_area: input.total_area,
                total_reduction: input.total_reduction,
                share_url: `/project/${crypto.randomUUID()}`,
            })
            .select()
            .single();

        return {
            data: data as Project | null,
            error: error ? new Error(error.message) : null
        };
    },

    /**
     * Get all projects for current user
     */
    async getMyProjects(): Promise<{ data: Project[]; error: Error | null }> {
        const userId = await getUserId();
        if (!userId) return { data: [], error: new Error('User not authenticated') };

        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) return { data: [], error: new Error(error.message) };
        return { data: (data as Project[]), error: null };
    },

    /**
     * Get a project by ID (public access for shared URLs)
     */
    async getById(id: string): Promise<{ data: Project | null; error: Error | null }> {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();

        return {
            data: data as Project | null,
            error: error ? new Error(error.message) : null
        };
    },

    /**
     * Get a project by share URL
     */
    async getByShareUrl(shareUrl: string): Promise<{ data: Project | null; error: Error | null }> {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('share_url', shareUrl)
            .single();

        return {
            data: data as Project | null,
            error: error ? new Error(error.message) : null
        };
    },

    /**
     * Update a project
     */
    async update(id: string, updates: Partial<CreateProjectInput>): Promise<{ error: Error | null }> {
        const { error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', id);

        return { error: error ? new Error(error.message) : null };
    },

    /**
     * Delete a project
     */
    async delete(id: string): Promise<{ error: Error | null }> {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        return { error: error ? new Error(error.message) : null };
    },
};
