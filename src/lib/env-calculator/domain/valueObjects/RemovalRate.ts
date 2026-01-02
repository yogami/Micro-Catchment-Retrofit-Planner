/**
 * BMP Removal Rates - EPA-based pollutant removal efficiencies
 * 
 * Data sources:
 * - EPA BMP Performance Database
 * - Virginia DEQ Runoff Reduction Method
 * - CASQA LID Handbook
 * 
 * @domain env-calculator
 * @layer domain/valueObjects
 */

export type BMPType = 'rain_garden' | 'permeable_pavement' | 'tree_planter' | 'green_roof' | 'bioswale';

export interface RemovalRate {
    readonly bmpType: BMPType;
    readonly phosphorus_lb_acre_yr: number;
    readonly nitrogen_lb_acre_yr: number;
    readonly sediment_percent: number;
    readonly runoffReduction_percent: number;
}

/**
 * EPA-validated removal rates by BMP type
 * Values are median removal efficiencies from peer-reviewed studies
 */
export const BMP_REMOVAL_RATES: Record<BMPType, RemovalRate> = {
    rain_garden: {
        bmpType: 'rain_garden',
        phosphorus_lb_acre_yr: 0.40,
        nitrogen_lb_acre_yr: 0.25,
        sediment_percent: 85,
        runoffReduction_percent: 40
    },
    permeable_pavement: {
        bmpType: 'permeable_pavement',
        phosphorus_lb_acre_yr: 0.35,
        nitrogen_lb_acre_yr: 0.20,
        sediment_percent: 80,
        runoffReduction_percent: 70
    },
    tree_planter: {
        bmpType: 'tree_planter',
        phosphorus_lb_acre_yr: 0.15,
        nitrogen_lb_acre_yr: 0.10,
        sediment_percent: 60,
        runoffReduction_percent: 25
    },
    green_roof: {
        bmpType: 'green_roof',
        phosphorus_lb_acre_yr: 0.20,
        nitrogen_lb_acre_yr: 0.15,
        sediment_percent: 70,
        runoffReduction_percent: 50
    },
    bioswale: {
        bmpType: 'bioswale',
        phosphorus_lb_acre_yr: 0.30,
        nitrogen_lb_acre_yr: 0.18,
        sediment_percent: 75,
        runoffReduction_percent: 35
    }
};

/**
 * Urban land use pollutant loading rates (baseline without BMPs)
 * Source: EPA STEPL model defaults
 */
export const URBAN_LOADING_RATES = {
    phosphorus_lb_acre_yr: 1.5,  // Commercial/Industrial
    nitrogen_lb_acre_yr: 10.0,   // Commercial/Industrial
    sediment_ton_acre_yr: 0.5    // Urban impervious
};
