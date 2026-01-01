/**
 * Database type definitions for Supabase
 */

export interface GreenFix {
    type: 'rain_garden' | 'permeable_pavement' | 'tree_planter';
    size: number;
    placement: string;
    reductionRate: number;
}

export interface Project {
    id: string;
    user_id: string;
    street_name: string;
    screenshot: string | null;
    features: GreenFix[];
    total_area: number;
    total_reduction: number;
    created_at: string;
    updated_at: string;
    share_url: string | null;
}

export interface Database {
    public: {
        Tables: {
            projects: {
                Row: Project;
                Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Project, 'id'>>;
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
    };
}
