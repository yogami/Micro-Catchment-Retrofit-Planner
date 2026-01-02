/**
 * Pollutant Entity - represents a type of water pollutant
 * 
 * @domain env-calculator
 * @layer domain/entities
 */

export type PollutantType = 'phosphorus' | 'nitrogen' | 'sediment';

export interface Pollutant {
    readonly type: PollutantType;
    readonly name: string;
    readonly unit: 'lb/yr' | 'kg/yr' | 'percent';
    readonly description: string;
}

export const POLLUTANTS: Record<PollutantType, Pollutant> = {
    phosphorus: {
        type: 'phosphorus',
        name: 'Total Phosphorus (TP)',
        unit: 'lb/yr',
        description: 'Primary nutrient causing algae blooms and eutrophication'
    },
    nitrogen: {
        type: 'nitrogen',
        name: 'Total Nitrogen (TN)',
        unit: 'lb/yr',
        description: 'Nutrient contributing to hypoxia in water bodies'
    },
    sediment: {
        type: 'sediment',
        name: 'Total Suspended Solids (TSS)',
        unit: 'percent',
        description: 'Particulate matter causing turbidity and habitat degradation'
    }
};
