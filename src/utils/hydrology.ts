import { getRobustRunoffPrediction } from '../ml/pinnInference';

/**
 * Hydrology Calculation Engine
 * Client-side calculations for green infrastructure sizing based on Berlin rainfall data
 */

/** Check if PINN model is ready for use */
export const hasPINNSupport = true;

/**
 * Compute peak runoff rate using Physics-Informed Neural Network
 * Falls back to Rational Method if PINN fails or uninitialized
 */
export async function computeRunoffWithPINN(
    rainfall_mm_hr: number,
    area_m2: number,
    slope: number = 0.02
): Promise<number> {
    return getRobustRunoffPrediction(rainfall_mm_hr, area_m2, slope);
}

/** Runoff coefficients for different surface types */

/** Runoff coefficients for different surface types */
export const RUNOFF_COEFFICIENTS = {
    impervious: 0.95,
    pervious: 0.25,
    permeablePaving: 0.45
};

export interface RegulationProfile {
    id: 'VA' | 'BE' | 'DEFAULT';
    name: string;
    description: string;
    designDepth_mm: number;
    designIntensity_mm_hr: number;
    rvFormula: (imperviousPercent: number) => number;
    units: 'imperial' | 'metric';
}

export const REGULATION_PROFILES: Record<string, RegulationProfile> = {
    VA: {
        id: 'VA',
        name: 'Virginia Stormwater Handbook (9VAC25-870)',
        description: 'US EPA/Virginia DEQ standards for Northern Virginia.',
        designDepth_mm: 25.4 * 1.2, // 1.2 inches standard for high-performance BMPs
        designIntensity_mm_hr: 50.8, // ~2 in/hr (10-yr Atlas 14 baseline)
        rvFormula: (i) => 0.05 + (0.009 * i), // Virginia Rv = 0.05 + 0.009(I)
        units: 'imperial'
    },
    BE: {
        id: 'BE',
        name: 'Berliner Regenwasseragentur (Schwammstadt)',
        description: 'German DWA-A 138 / Sponge City Berlin guidelines.',
        designDepth_mm: 30.0, // Berlin target for onsite retention
        designIntensity_mm_hr: 45.0, // Typical central European 10-yr event
        rvFormula: () => 0.9, // Fixed high-density urban coefficient
        units: 'metric'
    },
    DEFAULT: {
        id: 'DEFAULT',
        name: 'Standard EPA / Global Baseline',
        description: 'Generalized rational method baseline.',
        designDepth_mm: 25.4, // 1 inch
        designIntensity_mm_hr: 50.0,
        rvFormula: () => 0.9,
        units: 'metric'
    }
};

/**
 * Geographic lookup for regulation profile
 */
export function getProfileForLocation(lat: number, lon: number): RegulationProfile {
    // Basic bounding box check for Virginia (approximate)
    if (lat > 36.5 && lat < 39.5 && lon > -83.5 && lon < -75.5) {
        return REGULATION_PROFILES.VA;
    }
    // Basic bounding box for Berlin/Brandenburg
    if (lat > 52.3 && lat < 52.7 && lon > 13.0 && lon < 13.7) {
        return REGULATION_PROFILES.BE;
    }
    return REGULATION_PROFILES.DEFAULT;
}
export type SurfaceType = keyof typeof RUNOFF_COEFFICIENTS;

export interface GreenFix {
    type: 'rain_garden' | 'permeable_pavement' | 'tree_planter';
    size: number;       // m²
    reductionRate: number; // 0-1
    placement: string;
}

export interface PermeableCapacity {
    area: number;
    designStorm: number;
    infiltrationRate: number;
    safetyMargin: number;
    canHandle: boolean;
}

/**
 * Compute peak runoff rate in liters per second
 * Formula: Q = (rainfall × area × coefficient) / 3600
 * 
 * @param rainfall_mm_hr - Rainfall intensity in mm/hour
 * @param area_m2 - Catchment area in square meters
 * @param coeff - Runoff coefficient (0-1)
 * @returns Peak runoff in L/s
 */
export function computePeakRunoff(
    rainfall_mm_hr: number,
    area_m2: number,
    coeff: number
): number {
    // mm/hr × m² = L/hr, divide by 3600 for L/s
    return (rainfall_mm_hr * area_m2 * coeff) / 3600;
}

/**
 * Compute Water Quality Volume (WQv) for a given rainfall depth
 * Formula: WQv = (P * Rv * A)
 * 
 * @param depth_mm - Rainfall depth in mm
 * @param area_m2 - Catchment area in m²
 * @param coeff - Runoff coefficient (usually Rv)
 * @returns Required storage volume in Liters
 */
export function computeWQv(
    depth_mm: number,
    area_m2: number,
    coeff: number = 0.9
): number {
    // mm * m² = L
    return depth_mm * area_m2 * coeff;
}

/**
 * Compute WQv with regional Rv formula
 */
export function computeRegionalWQv(
    depth_mm: number,
    area_m2: number,
    profile: RegulationProfile
): number {
    const rv = profile.rvFormula(100); // Assuming 100% impervious catchments for scanning
    return depth_mm * area_m2 * rv;
}

/**
 * Size a rain garden based on required storage volume
 * 
 * @param runoff_Ls - Peak runoff rate in L/s
 * @param duration_hr - Storm duration in hours (default 1)
 * @param retentionFactor - Fraction of runoff to retain (default 0.8)
 * @returns Required volume in liters
 */
export function sizeRainGarden(
    runoff_Ls: number,
    duration_hr: number = 1,
    retentionFactor: number = 0.8
): number {
    // Volume = flow rate × duration × retention factor
    return runoff_Ls * retentionFactor * duration_hr * 3600;
}

/**
 * Calculate rain garden area from volume assuming standard depth
 * 
 * @param volume_L - Required volume in liters
 * @param depth_m - Garden depth in meters (default 0.3m)
 * @returns Required area in m²
 */
export function rainGardenAreaFromVolume(
    volume_L: number,
    depth_m: number = 0.3
): number {
    // 1000L = 1m³
    const volume_m3 = volume_L / 1000;
    return volume_m3 / depth_m;
}

/**
 * Compute permeable pavement capacity
 * 
 * @param area_m2 - Pavement area
 * @param designStorm_mm_hr - Design storm intensity
 * @param infiltrationRate_mm_hr - Soil infiltration rate
 * @returns Capacity assessment
 */
export function computePermeablePavementCapacity(
    area_m2: number,
    designStorm_mm_hr: number,
    infiltrationRate_mm_hr: number
): PermeableCapacity {
    const safetyMargin = Math.round((infiltrationRate_mm_hr / designStorm_mm_hr) * 100);
    return {
        area: area_m2,
        designStorm: designStorm_mm_hr,
        infiltrationRate: infiltrationRate_mm_hr,
        safetyMargin,
        canHandle: infiltrationRate_mm_hr >= designStorm_mm_hr
    };
}

/**
 * Compute optimal tree planter count for a road verge
 * 
 * @param vergeLength_m - Available length in meters
 * @param spacing_m - Minimum spacing between trees
 * @returns Recommended planter count
 */
export function computeTreePlanterCount(
    vergeLength_m: number,
    spacing_m: number
): number {
    return Math.floor(vergeLength_m / spacing_m);
}

/**
 * Calculate total runoff reduction from installed fixes
 * 
 * @param fixes - Array of installed green infrastructure
 * @param totalArea_m2 - Total impervious area
 * @returns Reduction percentage (0-100)
 */
export function calculateTotalReduction(
    fixes: Array<{ Size?: string; 'Reduction Rate'?: string; size?: number; reductionRate?: number }>,
    totalArea_m2: number
): number {
    let totalCapture = 0;

    for (const fix of fixes) {
        const size = fix.size ?? parseFloat((fix.Size || '0').replace('m²', ''));
        const rate = fix.reductionRate ?? parseFloat(fix['Reduction Rate'] || '0');
        totalCapture += size * rate;
    }

    return (totalCapture / totalArea_m2) * 100;
}

/**
 * Suggest green infrastructure fixes for a given impervious area
 * 
 * @param area_m2 - Impervious area to treat
 * @param rainfall_mm_hr - Design rainfall intensity
 * @returns Array of suggested fixes with sizing
 */
export function suggestGreenFixes(
    area_m2: number,
    rainfall: number = 50,
    mode: 'rate' | 'volume' = 'rate',
    profile: RegulationProfile = REGULATION_PROFILES.DEFAULT
): GreenFix[] {
    // Standard recommendations based on area
    const fixes: GreenFix[] = [];
    const rv = profile.rvFormula(100);

    // If in volume mode, we might want to size specifically for the WQv
    const designVolume = mode === 'volume'
        ? computeWQv(rainfall, area_m2, rv)
        : computePeakRunoff(rainfall, area_m2, rv) * 3600; // Simulated volume for 1hr

    void designVolume; // For now keeping the heuristic sizing, but marking volume for future refinement

    // Rain garden: 20% of area for sidewalk edges
    const rainGardenSize = Math.round(area_m2 * 0.2);
    fixes.push({
        type: 'rain_garden',
        size: rainGardenSize,
        reductionRate: 0.4,
        placement: 'Sidewalk edge'
    });

    // Permeable pavement: 50% of parking areas
    const permeableSize = Math.round(area_m2 * 0.5);
    fixes.push({
        type: 'permeable_pavement',
        size: permeableSize,
        reductionRate: 0.7,
        placement: 'Parking area'
    });

    // Tree planters: 10m² each along road verge
    const planterCount = 3;
    fixes.push({
        type: 'tree_planter',
        size: 10 * planterCount,
        reductionRate: 0.25,
        placement: 'Road verge'
    });

    return fixes;
}

/**
 * Format runoff amount for display
 * 
 * @param runoff_Ls - Runoff in L/s
 * @returns Formatted string
 */
export function formatRunoffDisplay(runoff_Ls: number): string {
    const litersPerMin = runoff_Ls * 60;
    return `Handles ${Math.round(litersPerMin)}L/min storm`;
}
