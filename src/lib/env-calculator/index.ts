/**
 * Environmental Calculator Library
 * 
 * Domain-agnostic library for environmental metrics calculation:
 * - Pollutant load reduction (TN/TP/TSS)
 * - Co-benefits (carbon, energy, jobs, equity)
 * 
 * Designed for reuse across applications like:
 * - Grant applications (CFPF, SLAF, BRIC)
 * - ESG reporting
 * - Carbon credit calculations
 * - Sustainability dashboards
 * 
 * @example
 * ```typescript
 * import { PollutantCalculationService } from '@/lib/env-calculator';
 * 
 * const service = new PollutantCalculationService();
 * const result = service.calculateRemoval({
 *   bmpType: 'rain_garden',
 *   area_m2: 20,
 *   imperviousPercent: 100,
 *   annualRainfall_mm: 1000
 * });
 * 
 * console.log(result.phosphorus_lb_yr); // 0.12
 * ```
 */

// Domain Layer - Entities
export { POLLUTANTS } from './domain/entities/Pollutant';
export type { Pollutant, PollutantType } from './domain/entities/Pollutant';

// Domain Layer - Value Objects
export { BMP_REMOVAL_RATES, URBAN_LOADING_RATES } from './domain/valueObjects/RemovalRate';
export type { BMPType, RemovalRate } from './domain/valueObjects/RemovalRate';

export { createPollutantLoadResult, createComparison } from './domain/valueObjects/PollutantLoadResult';
export type { PollutantLoadResult, PrePostComparison } from './domain/valueObjects/PollutantLoadResult';

// Domain Layer - Services
export { PollutantCalculationService } from './domain/services/PollutantCalculationService';
export type {
    RemovalInput,
    BaselineInput,
    BMPSpec,
    RetrofitInput
} from './domain/services/PollutantCalculationService';

// ============================================================================
// Factory Functions for Easy Setup
// ============================================================================

import { PollutantCalculationService } from './domain/services/PollutantCalculationService';

/**
 * Create a pollutant calculation service instance
 */
export function createPollutantService(): PollutantCalculationService {
    return new PollutantCalculationService();
}
