
/**
 * Utility for unit conversion between Metric and Imperial/US Customary systems
 * for hydrology and civil engineering.
 */

export type UnitSystem = 'metric' | 'imperial';

export interface UnitConfig {
    system: UnitSystem;
}

// Conversion Constants
const M2_TO_SQFT = 10.7639;
const MM_TO_INCH = 0.0393701;
const LS_TO_CFS = 0.0353147;
const L_TO_GAL = 0.264172;

/**
 * Convert area based on target unit system
 */
export function convertArea(value: number, to: UnitSystem): number {
    return to === 'imperial' ? value * M2_TO_SQFT : value;
}

/**
 * Convert area back to metric from target unit system
 */
export function parseArea(value: number, from: UnitSystem): number {
    return from === 'imperial' ? value / M2_TO_SQFT : value;
}

/**
 * Convert intensity (rainfall) based on target unit system
 */
export function convertRainfall(value: number, to: UnitSystem): number {
    return to === 'imperial' ? value * MM_TO_INCH : value;
}

/**
 * Convert flow rate (peak runoff) based on target unit system
 */
export function convertFlow(value: number, to: UnitSystem): number {
    return to === 'imperial' ? value * LS_TO_CFS : value;
}

/**
 * Convert depth based on target unit system
 */
export function convertDepth(value: number, to: UnitSystem): number {
    return to === 'imperial' ? value * MM_TO_INCH : value;
}

/**
 * Convert volume (Liters) based on target unit system (Gallons)
 */
export function convertVolume(value: number, to: UnitSystem): number {
    return to === 'imperial' ? value * L_TO_GAL : value;
}

/**
 * Get the label for area units
 */
export function getAreaUnit(system: UnitSystem): string {
    return system === 'imperial' ? 'sq ft' : 'm²';
}

/**
 * Get the label for rainfall intensity units
 */
export function getRainUnit(system: UnitSystem): string {
    return system === 'imperial' ? 'in/hr' : 'mm/hr';
}

/**
 * Get the label for flow rate units
 */
export function getFlowUnit(system: UnitSystem): string {
    return system === 'imperial' ? 'cfs' : 'L/s';
}

/**
 * Get the label for depth units
 */
export function getDepthUnit(system: UnitSystem): string {
    return system === 'imperial' ? 'in' : 'mm';
}

/**
 * Get the label for volume units
 */
export function getVolumeUnit(system: UnitSystem): string {
    return system === 'imperial' ? 'gal' : 'L';
}
