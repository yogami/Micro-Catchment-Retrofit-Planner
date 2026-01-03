/**
 * PollutantCalculationService - Core domain service for pollutant load calculations
 * 
 * Implements EPA/SLAF formulas for calculating pollutant removal by BMPs.
 * 
 * Formula:
 * Load = Area × Impervious% × Rv × AnnualRainfall × LoadingRate
 * Removal = Load × RemovalEfficiency
 * 
 * @domain env-calculator
 * @layer domain/services
 */

import { BMP_REMOVAL_RATES, URBAN_LOADING_RATES, type BMPType } from '../valueObjects/RemovalRate';
import { createPollutantLoadResult, type PollutantLoadResult } from '../valueObjects/PollutantLoadResult';

// Conversion constants
const M2_TO_ACRES = 0.000247105;
const MM_TO_INCHES = 0.0393701;

export interface RemovalInput {
    bmpType: BMPType;
    area_m2: number;
    imperviousPercent: number;
    annualRainfall_mm: number;
}

export interface BaselineInput {
    area_m2: number;
    imperviousPercent: number;
    annualRainfall_mm: number;
}

export interface BMPSpec {
    type: BMPType;
    area_m2: number;
}

export interface RetrofitInput extends BaselineInput {
    bmps: BMPSpec[];
}

export class PollutantCalculationService {
    /**
     * Calculate pollutant removal for a single BMP
     */
    calculateRemoval(input: RemovalInput): PollutantLoadResult {
        const rates = BMP_REMOVAL_RATES[input.bmpType];
        if (!rates) {
            throw new Error(`Unknown BMP type: ${input.bmpType}`);
        }

        const area_acres = input.area_m2 * M2_TO_ACRES;
        const impervFraction = input.imperviousPercent / 100;

        // Adjust for rainfall (normalize to 40" baseline)
        const rainfallFactor = (input.annualRainfall_mm * MM_TO_INCHES) / 40;

        // Calculate annual load removed
        const phosphorus = rates.phosphorus_lb_acre_yr * area_acres * impervFraction * rainfallFactor;
        const nitrogen = rates.nitrogen_lb_acre_yr * area_acres * impervFraction * rainfallFactor;

        return createPollutantLoadResult({
            phosphorus_lb_yr: phosphorus,
            nitrogen_lb_yr: nitrogen,
            sediment_percent: rates.sediment_percent,
            source: 'bmp_removal',
            bmpType: input.bmpType
        });
    }

    /**
     * Calculate baseline pollutant load (without any BMPs)
     */
    calculateBaselineLoad(input: BaselineInput): PollutantLoadResult {
        const area_acres = input.area_m2 * M2_TO_ACRES;
        const impervFraction = input.imperviousPercent / 100;

        // Adjust for rainfall (normalize to 40" baseline)
        const rainfallFactor = (input.annualRainfall_mm * MM_TO_INCHES) / 40;

        const phosphorus = URBAN_LOADING_RATES.phosphorus_lb_acre_yr * area_acres * impervFraction * rainfallFactor;
        const nitrogen = URBAN_LOADING_RATES.nitrogen_lb_acre_yr * area_acres * impervFraction * rainfallFactor;

        return createPollutantLoadResult({
            phosphorus_lb_yr: phosphorus,
            nitrogen_lb_yr: nitrogen,
            sediment_percent: 0,
            source: 'baseline'
        });
    }

    /**
     * Calculate post-retrofit pollutant load (baseline minus BMP removals)
     */
    calculateWithBMPs(input: RetrofitInput): PollutantLoadResult {
        // Start with baseline load
        const baseline = this.calculateBaselineLoad({
            area_m2: input.area_m2,
            imperviousPercent: input.imperviousPercent,
            annualRainfall_mm: input.annualRainfall_mm
        });

        // Calculate total removal from all BMPs
        let totalPRemoval = 0;
        let totalNRemoval = 0;
        let maxSedimentRemoval = 0;

        for (const bmp of input.bmps) {
            const removal = this.calculateRemoval({
                bmpType: bmp.type,
                area_m2: bmp.area_m2,
                imperviousPercent: input.imperviousPercent,
                annualRainfall_mm: input.annualRainfall_mm
            });

            totalPRemoval += removal.phosphorus_lb_yr;
            totalNRemoval += removal.nitrogen_lb_yr;
            maxSedimentRemoval = Math.max(maxSedimentRemoval, removal.sediment_percent);
        }

        // Post-retrofit = baseline - removal (can't go below zero)
        const postP = Math.max(0, baseline.phosphorus_lb_yr - totalPRemoval);
        const postN = Math.max(0, baseline.nitrogen_lb_yr - totalNRemoval);

        return createPollutantLoadResult({
            phosphorus_lb_yr: postP,
            nitrogen_lb_yr: postN,
            sediment_percent: maxSedimentRemoval,
            source: 'post_retrofit'
        });
    }

    /**
     * Get removal efficiency summary for grant applications
     */
    getSLAFSummary(input: RetrofitInput): {
        totalPhosphorusRemoved_lb_yr: number;
        totalNitrogenRemoved_lb_yr: number;
        sedimentReduction_percent: number;
        meetsSLAFThreshold: boolean;
    } {
        const baseline = this.calculateBaselineLoad(input);
        const postRetrofit = this.calculateWithBMPs(input);

        const pRemoved = baseline.phosphorus_lb_yr - postRetrofit.phosphorus_lb_yr;
        const nRemoved = baseline.nitrogen_lb_yr - postRetrofit.nitrogen_lb_yr;

        // SLAF typically requires meaningful phosphorus reduction
        const SLAF_MIN_P_REDUCTION = 0.05; // lb/yr minimum

        return {
            totalPhosphorusRemoved_lb_yr: pRemoved,
            totalNitrogenRemoved_lb_yr: nRemoved,
            sedimentReduction_percent: postRetrofit.sediment_percent,
            meetsSLAFThreshold: pRemoved >= SLAF_MIN_P_REDUCTION
        };
    }
}
