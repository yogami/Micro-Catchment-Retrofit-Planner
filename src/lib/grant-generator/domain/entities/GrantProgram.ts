/**
 * Grant Program Entity - Defines grant program requirements
 * 
 * @domain grant-generator
 * @layer domain/entities
 */

export type GrantProgramId = 'CFPF' | 'SLAF' | 'BRIC' | 'BENE2';

export interface GrantProgram {
    readonly id: GrantProgramId;
    readonly name: string;
    readonly description: string;
    readonly federalMatch_percent: number;
    readonly localMatch_percent: number;
    readonly requirements: GrantRequirement[];
    readonly applicableRegions: string[]; // Jurisdiction code patterns
}

export interface GrantRequirement {
    readonly id: string;
    readonly label: string;
    readonly type: 'boolean' | 'numeric' | 'text';
    readonly threshold?: number;
    readonly required: boolean;
    readonly description: string;
}

/**
 * Pre-defined grant programs with their requirements
 */
export const GRANT_PROGRAMS: Record<GrantProgramId, GrantProgram> = {
    CFPF: {
        id: 'CFPF',
        name: 'Clean Flood Protection Fund',
        description: 'Federal funding for stormwater resilience and flood mitigation projects.',
        federalMatch_percent: 75,
        localMatch_percent: 25,
        applicableRegions: ['US-*'],
        requirements: [
            {
                id: 'resilience_plan',
                label: 'FEMA-Approved Resilience Plan',
                type: 'boolean',
                required: true,
                description: 'Project must align with local resilience plan.'
            },
            {
                id: 'bcr',
                label: 'Cost-Benefit Ratio ≥ 1.0',
                type: 'numeric',
                threshold: 1.0,
                required: true,
                description: 'BCR must exceed 1.0 based on avoided flood damages.'
            },
            {
                id: 'local_match',
                label: '25% Local Match',
                type: 'numeric',
                threshold: 25,
                required: true,
                description: 'Local jurisdiction must provide 25% match funding.'
            },
            {
                id: 'water_quality',
                label: 'Water Quality Metrics',
                type: 'boolean',
                required: false,
                description: 'Pollutant removal data enhances application.'
            }
        ]
    },
    SLAF: {
        id: 'SLAF',
        name: 'Stormwater Load Abatement Fund',
        description: 'State funding prioritizing nutrient and sediment reduction.',
        federalMatch_percent: 50,
        localMatch_percent: 50,
        applicableRegions: ['US-VA', 'US-MD', 'US-PA'],
        requirements: [
            {
                id: 'pollutant_removal',
                label: 'Measurable Pollutant Reduction',
                type: 'boolean',
                required: true,
                description: 'Must demonstrate TN/TP/sediment removal.'
            },
            {
                id: 'chesapeake_watershed',
                label: 'Chesapeake Bay Watershed',
                type: 'boolean',
                required: false,
                description: 'Priority given to Chesapeake projects.'
            }
        ]
    },
    BRIC: {
        id: 'BRIC',
        name: 'Building Resilient Infrastructure & Communities',
        description: 'FEMA program for hazard mitigation and climate resilience.',
        federalMatch_percent: 75,
        localMatch_percent: 25,
        applicableRegions: ['US-*'],
        requirements: [
            {
                id: 'bcr',
                label: 'Cost-Benefit Ratio ≥ 1.0',
                type: 'numeric',
                threshold: 1.0,
                required: true,
                description: 'BCR required for eligibility.'
            },
            {
                id: 'equity',
                label: 'Community Equity Score',
                type: 'boolean',
                required: false,
                description: 'Priority for low-income/disadvantaged communities.'
            },
            {
                id: 'hazard_mitigation_plan',
                label: 'Hazard Mitigation Plan',
                type: 'boolean',
                required: true,
                description: 'Must align with FEMA-approved HMP.'
            }
        ]
    },
    BENE2: {
        id: 'BENE2',
        name: 'Berliner Energie und Nachhaltigkeit (BENE 2)',
        description: 'Berlin funding for Schwammstadt (Sponge City) projects.',
        federalMatch_percent: 60,
        localMatch_percent: 40,
        applicableRegions: ['DE-BE'],
        requirements: [
            {
                id: 'schwammstadt',
                label: 'Schwammstadt Compliance',
                type: 'boolean',
                required: true,
                description: 'Must follow Berlin Sponge City guidelines.'
            },
            {
                id: 'dwa_a138',
                label: 'DWA-A 138 Infiltration',
                type: 'boolean',
                required: true,
                description: 'Must meet German infiltration standards.'
            },
            {
                id: 'min_investment',
                label: 'Minimum Investment €200k',
                type: 'numeric',
                threshold: 200000,
                required: false,
                description: 'Larger projects receive priority.'
            }
        ]
    }
};
