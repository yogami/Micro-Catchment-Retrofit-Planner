/**
 * PollutantLoadResult Value Object - represents pollutant load calculation results
 * 
 * @domain env-calculator
 * @layer domain/valueObjects
 */

export interface PollutantLoadResult {
    /** Total Phosphorus removed/remaining in lbs per year */
    readonly phosphorus_lb_yr: number;

    /** Total Nitrogen removed/remaining in lbs per year */
    readonly nitrogen_lb_yr: number;

    /** Sediment (TSS) removal percentage */
    readonly sediment_percent: number;

    /** Source of the calculation */
    readonly source: 'baseline' | 'bmp_removal' | 'post_retrofit';

    /** Optional: the BMP type if this is a removal calculation */
    readonly bmpType?: string;
}

export interface PrePostComparison {
    readonly preRetrofit: PollutantLoadResult;
    readonly postRetrofit: PollutantLoadResult;
    readonly phosphorusReduction_percent: number;
    readonly nitrogenReduction_percent: number;
    readonly sedimentReduction_percent: number;
}

/**
 * Create a pollutant load result
 */
export function createPollutantLoadResult(
    phosphorus_lb_yr: number,
    nitrogen_lb_yr: number,
    sediment_percent: number,
    source: 'baseline' | 'bmp_removal' | 'post_retrofit',
    bmpType?: string
): PollutantLoadResult {
    return {
        phosphorus_lb_yr: Math.max(0, phosphorus_lb_yr),
        nitrogen_lb_yr: Math.max(0, nitrogen_lb_yr),
        sediment_percent: Math.min(100, Math.max(0, sediment_percent)),
        source,
        bmpType
    };
}

/**
 * Calculate pre/post comparison metrics
 */
export function createComparison(
    pre: PollutantLoadResult,
    post: PollutantLoadResult
): PrePostComparison {
    const pReduction = pre.phosphorus_lb_yr > 0
        ? ((pre.phosphorus_lb_yr - post.phosphorus_lb_yr) / pre.phosphorus_lb_yr) * 100
        : 0;
    const nReduction = pre.nitrogen_lb_yr > 0
        ? ((pre.nitrogen_lb_yr - post.nitrogen_lb_yr) / pre.nitrogen_lb_yr) * 100
        : 0;
    const sReduction = post.sediment_percent; // Sediment is already a removal %

    return {
        preRetrofit: pre,
        postRetrofit: post,
        phosphorusReduction_percent: Math.max(0, pReduction),
        nitrogenReduction_percent: Math.max(0, nReduction),
        sedimentReduction_percent: Math.max(0, sReduction)
    };
}
