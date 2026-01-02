/**
 * Grant Template Definitions - Field mappings for grant applications
 * 
 * @domain grant-generator
 * @layer templates
 */

import type { GrantProgramId } from '../domain/entities/GrantProgram';

export interface TemplateField {
    id: string;
    label: string;
    source: 'project' | 'geo' | 'calc' | 'compliance' | 'static';
    sourceKey?: string;
    calcFn?: string;
    staticValue?: string;
    required: boolean;
}

export interface GrantTemplate {
    programId: GrantProgramId;
    title: string;
    sections: TemplateSection[];
}

export interface TemplateSection {
    title: string;
    fields: TemplateField[];
}

/**
 * CFPF Grant Application Template
 */
export const CFPF_TEMPLATE: GrantTemplate = {
    programId: 'CFPF',
    title: 'Clean Flood Protection Fund - Pre-Application',
    sections: [
        {
            title: 'Project Information',
            fields: [
                { id: 'project_name', label: 'Project Name', source: 'project', sourceKey: 'name', required: true },
                { id: 'jurisdiction', label: 'Jurisdiction', source: 'geo', sourceKey: 'hierarchy', required: true },
                { id: 'project_type', label: 'Project Type', source: 'static', staticValue: 'Green Infrastructure Retrofit', required: true },
                { id: 'area', label: 'Project Area', source: 'project', sourceKey: 'area_m2', required: true }
            ]
        },
        {
            title: 'Budget & Funding',
            fields: [
                { id: 'total_cost', label: 'Total Project Cost', source: 'calc', calcFn: 'area * 150', required: true },
                { id: 'federal_request', label: 'Federal Request (75%)', source: 'calc', calcFn: 'totalCost * 0.75', required: true },
                { id: 'local_match', label: 'Local Match (25%)', source: 'calc', calcFn: 'totalCost * 0.25', required: true }
            ]
        },
        {
            title: 'Engineering Metrics',
            fields: [
                { id: 'bcr', label: 'Cost-Benefit Ratio', source: 'project', sourceKey: 'bcrValue', required: true },
                { id: 'peak_reduction', label: 'Peak Runoff Reduction', source: 'project', sourceKey: 'peakReduction_percent', required: true },
                { id: 'wqv', label: 'Water Quality Volume', source: 'project', sourceKey: 'retention_in', required: true }
            ]
        },
        {
            title: 'Pollutant Removal',
            fields: [
                { id: 'phosphorus', label: 'Phosphorus Removal (lb/yr)', source: 'calc', calcFn: 'pollutants.TP', required: false },
                { id: 'nitrogen', label: 'Nitrogen Removal (lb/yr)', source: 'calc', calcFn: 'pollutants.TN', required: false },
                { id: 'sediment', label: 'Sediment Reduction', source: 'calc', calcFn: 'pollutants.sediment', required: false }
            ]
        },
        {
            title: 'Compliance',
            fields: [
                { id: 'resilience_plan', label: 'Resilience Plan Alignment', source: 'compliance', sourceKey: 'resilience_plan', required: true },
                { id: 'local_standard', label: 'Local Standard Compliance', source: 'compliance', sourceKey: 'local', required: true }
            ]
        }
    ]
};

/**
 * SLAF Grant Application Template
 */
export const SLAF_TEMPLATE: GrantTemplate = {
    programId: 'SLAF',
    title: 'Stormwater Load Abatement Fund - Application',
    sections: [
        {
            title: 'Project Identification',
            fields: [
                { id: 'project_name', label: 'Project Name', source: 'project', sourceKey: 'name', required: true },
                { id: 'jurisdiction', label: 'Jurisdiction', source: 'geo', sourceKey: 'hierarchy', required: true },
                { id: 'watershed', label: 'Watershed', source: 'geo', sourceKey: 'watershed', required: false }
            ]
        },
        {
            title: 'Pollutant Reduction (Primary Focus)',
            fields: [
                { id: 'phosphorus', label: 'Total Phosphorus Reduction (lb/yr)', source: 'calc', calcFn: 'pollutants.TP', required: true },
                { id: 'nitrogen', label: 'Total Nitrogen Reduction (lb/yr)', source: 'calc', calcFn: 'pollutants.TN', required: true },
                { id: 'sediment', label: 'Sediment Reduction (tons/yr)', source: 'calc', calcFn: 'pollutants.sediment', required: true }
            ]
        },
        {
            title: 'Budget',
            fields: [
                { id: 'total_cost', label: 'Total Project Cost', source: 'calc', calcFn: 'area * 150', required: true },
                { id: 'slaf_request', label: 'SLAF Request (50%)', source: 'calc', calcFn: 'totalCost * 0.50', required: true },
                { id: 'local_match', label: 'Local Match (50%)', source: 'calc', calcFn: 'totalCost * 0.50', required: true }
            ]
        }
    ]
};

/**
 * BRIC Grant Application Template
 */
export const BRIC_TEMPLATE: GrantTemplate = {
    programId: 'BRIC',
    title: 'FEMA BRIC - Subapplication Summary',
    sections: [
        {
            title: 'Project Overview',
            fields: [
                { id: 'project_name', label: 'Project Title', source: 'project', sourceKey: 'name', required: true },
                { id: 'jurisdiction', label: 'Applicant Jurisdiction', source: 'geo', sourceKey: 'hierarchy', required: true },
                { id: 'hazard_type', label: 'Hazard Type', source: 'static', staticValue: 'Flood', required: true }
            ]
        },
        {
            title: 'Cost-Benefit Analysis',
            fields: [
                { id: 'bcr', label: 'Benefit-Cost Ratio', source: 'project', sourceKey: 'bcrValue', required: true },
                { id: 'total_cost', label: 'Total Project Cost', source: 'calc', calcFn: 'area * 150', required: true },
                { id: 'federal_share', label: 'Federal Share (75%)', source: 'calc', calcFn: 'totalCost * 0.75', required: true }
            ]
        },
        {
            title: 'Resilience Metrics',
            fields: [
                { id: 'peak_reduction', label: 'Peak Flow Reduction', source: 'project', sourceKey: 'peakReduction_percent', required: true },
                { id: 'hmp_alignment', label: 'Hazard Mitigation Plan', source: 'compliance', sourceKey: 'hazard_mitigation_plan', required: true }
            ]
        }
    ]
};

/**
 * BENE2 (Berlin) Grant Application Template
 */
export const BENE2_TEMPLATE: GrantTemplate = {
    programId: 'BENE2',
    title: 'BENE 2 - Schwammstadt Förderantrag',
    sections: [
        {
            title: 'Projektübersicht',
            fields: [
                { id: 'project_name', label: 'Projektname', source: 'project', sourceKey: 'name', required: true },
                { id: 'location', label: 'Standort', source: 'geo', sourceKey: 'hierarchy', required: true },
                { id: 'area', label: 'Projektfläche (m²)', source: 'project', sourceKey: 'area_m2', required: true }
            ]
        },
        {
            title: 'Technische Anforderungen',
            fields: [
                { id: 'retention', label: 'Rückhalt (mm)', source: 'project', sourceKey: 'retention_mm', required: true },
                { id: 'infiltration', label: 'Versickerungsrate (mm/h)', source: 'project', sourceKey: 'infiltrationRate_mm_hr', required: false },
                { id: 'schwammstadt', label: 'Schwammstadt-Konformität', source: 'compliance', sourceKey: 'schwammstadt', required: true },
                { id: 'dwa', label: 'DWA-A 138 Einhaltung', source: 'compliance', sourceKey: 'dwa_a138', required: true }
            ]
        },
        {
            title: 'Budget',
            fields: [
                { id: 'total_cost', label: 'Gesamtkosten (€)', source: 'calc', calcFn: 'area * 120', required: true },
                { id: 'bene2_request', label: 'BENE2 Antrag (60%)', source: 'calc', calcFn: 'totalCost * 0.60', required: true },
                { id: 'eigenanteil', label: 'Eigenanteil (40%)', source: 'calc', calcFn: 'totalCost * 0.40', required: true }
            ]
        }
    ]
};

export const GRANT_TEMPLATES: Record<GrantProgramId, GrantTemplate> = {
    CFPF: CFPF_TEMPLATE,
    SLAF: SLAF_TEMPLATE,
    BRIC: BRIC_TEMPLATE,
    BENE2: BENE2_TEMPLATE
};
