/**
 * Contract Tests: env-calculator
 * 
 * Validates the public API surface of the env-calculator microservice.
 * Tests factory function, pollutant entities, removal rates, and calculation service.
 */
import {
    createPollutantService,
    PollutantCalculationService,
    POLLUTANTS,
    BMP_REMOVAL_RATES,
    URBAN_LOADING_RATES,
    createPollutantLoadResult,
    createComparison,
    type Pollutant,
    type PollutantType,
    type BMPType,
    type RemovalRate,
    type PollutantLoadResult,
    type PrePostComparison,
    type RemovalInput,
    type BaselineInput,
    type BMPSpec,
    type RetrofitInput
} from '../../src/lib/env-calculator';

describe('env-calculator Contract Tests', () => {
    describe('Factory Function', () => {
        it('createPollutantService returns valid service', () => {
            const service = createPollutantService();

            expect(service).toBeInstanceOf(PollutantCalculationService);
        });
    });

    describe('POLLUTANTS Entity', () => {
        it('exports POLLUTANTS record', () => {
            expect(POLLUTANTS).toBeDefined();
            expect(typeof POLLUTANTS).toBe('object');
        });

        it('includes phosphorus', () => {
            expect(POLLUTANTS.phosphorus).toBeDefined();
            expect(POLLUTANTS.phosphorus.name).toContain('Phosphorus');
        });

        it('includes nitrogen', () => {
            expect(POLLUTANTS.nitrogen).toBeDefined();
            expect(POLLUTANTS.nitrogen.name).toContain('Nitrogen');
        });

        it('includes sediment', () => {
            expect(POLLUTANTS.sediment).toBeDefined();
            expect(POLLUTANTS.sediment.name).toContain('Solids');
        });

        it('all pollutants have required structure', () => {
            const types: PollutantType[] = ['phosphorus', 'nitrogen', 'sediment'];
            for (const type of types) {
                const pollutant = POLLUTANTS[type];
                expect(pollutant.type).toBe(type);
                expect(pollutant.name).toBeDefined();
                expect(pollutant.unit).toBeDefined();
            }
        });
    });

    describe('BMP_REMOVAL_RATES', () => {
        it('exports removal rates object', () => {
            expect(BMP_REMOVAL_RATES).toBeDefined();
            expect(typeof BMP_REMOVAL_RATES).toBe('object');
        });

        it('includes rain_garden rates', () => {
            expect(BMP_REMOVAL_RATES.rain_garden).toBeDefined();
        });

        it('includes permeable_pavement rates', () => {
            expect(BMP_REMOVAL_RATES.permeable_pavement).toBeDefined();
        });

        it('removal rates have phosphorus, nitrogen, sediment values', () => {
            const rates = BMP_REMOVAL_RATES.rain_garden;

            expect(typeof rates.phosphorus_lb_acre_yr).toBe('number');
            expect(typeof rates.nitrogen_lb_acre_yr).toBe('number');
            expect(typeof rates.sediment_percent).toBe('number');
        });
    });

    describe('URBAN_LOADING_RATES', () => {
        it('exports urban loading rates', () => {
            expect(URBAN_LOADING_RATES).toBeDefined();
            expect(typeof URBAN_LOADING_RATES).toBe('object');
        });

        it('has pollutant loading values', () => {
            expect(URBAN_LOADING_RATES.phosphorus_lb_acre_yr).toBeDefined();
            expect(URBAN_LOADING_RATES.nitrogen_lb_acre_yr).toBeDefined();
        });
    });

    describe('PollutantCalculationService', () => {
        let service: PollutantCalculationService;

        beforeEach(() => {
            service = createPollutantService();
        });

        it('has calculateRemoval method', () => {
            expect(typeof service.calculateRemoval).toBe('function');
        });

        it('has calculateBaselineLoad method', () => {
            expect(typeof service.calculateBaselineLoad).toBe('function');
        });

        it('has calculateWithBMPs method', () => {
            expect(typeof service.calculateWithBMPs).toBe('function');
        });

        it('has getSLAFSummary method', () => {
            expect(typeof service.getSLAFSummary).toBe('function');
        });

        it('calculateRemoval returns PollutantLoadResult', () => {
            const input: RemovalInput = {
                bmpType: 'rain_garden',
                area_m2: 20,
                imperviousPercent: 100,
                annualRainfall_mm: 1000
            };

            const result = service.calculateRemoval(input);

            expect(result).toBeDefined();
            expect(typeof result.phosphorus_lb_yr).toBe('number');
            expect(typeof result.nitrogen_lb_yr).toBe('number');
            expect(typeof result.sediment_percent).toBe('number');
            expect(result.source).toBe('bmp_removal');
        });

        it('calculateBaselineLoad returns baseline loads', () => {
            const input: BaselineInput = {
                area_m2: 100,
                imperviousPercent: 80,
                annualRainfall_mm: 1000
            };

            const result = service.calculateBaselineLoad(input);

            expect(result).toBeDefined();
            expect(typeof result.phosphorus_lb_yr).toBe('number');
            expect(result.source).toBe('baseline');
        });

        it('calculateWithBMPs returns post-retrofit result', () => {
            const input: RetrofitInput = {
                area_m2: 100,
                imperviousPercent: 80,
                annualRainfall_mm: 1000,
                bmps: [{ type: 'rain_garden', area_m2: 20 }]
            };

            const result = service.calculateWithBMPs(input);

            expect(result).toBeDefined();
            expect(result.source).toBe('post_retrofit');
        });

        it('getSLAFSummary returns threshold status', () => {
            const input: RetrofitInput = {
                area_m2: 100,
                imperviousPercent: 80,
                annualRainfall_mm: 1000,
                bmps: [{ type: 'rain_garden', area_m2: 20 }]
            };

            const result = service.getSLAFSummary(input);

            expect(result).toBeDefined();
            expect(typeof result.totalPhosphorusRemoved_lb_yr).toBe('number');
            expect(typeof result.meetsSLAFThreshold).toBe('boolean');
        });
    });

    describe('Value Object Factory Functions', () => {
        it('createPollutantLoadResult creates valid result', () => {
            const result = createPollutantLoadResult({
                phosphorus_lb_yr: 10,
                nitrogen_lb_yr: 1,
                sediment_percent: 80,
                source: 'baseline'
            });

            expect(result.phosphorus_lb_yr).toBe(10);
            expect(result.nitrogen_lb_yr).toBe(1);
            expect(result.sediment_percent).toBe(80);
        });

        it('createComparison creates valid comparison', () => {
            const before = createPollutantLoadResult({
                phosphorus_lb_yr: 10,
                nitrogen_lb_yr: 1,
                sediment_percent: 0,
                source: 'baseline'
            });
            const after = createPollutantLoadResult({
                phosphorus_lb_yr: 5,
                nitrogen_lb_yr: 0.5,
                sediment_percent: 50,
                source: 'post_retrofit'
            });

            const comparison = createComparison(before, after);

            expect(comparison.preRetrofit).toBe(before);
            expect(comparison.postRetrofit).toBe(after);
            expect(typeof comparison.phosphorusReduction_percent).toBe('number');
            expect(typeof comparison.nitrogenReduction_percent).toBe('number');
        });
    });

    describe('Type Exports', () => {
        it('PollutantType includes expected values', () => {
            const validTypes: PollutantType[] = ['phosphorus', 'nitrogen', 'sediment'];

            expect(validTypes).toContain('phosphorus');
            expect(validTypes).toContain('nitrogen');
            expect(validTypes).toContain('sediment');
        });

        it('BMPType includes expected values', () => {
            const validTypes: BMPType[] = [
                'rain_garden',
                'permeable_pavement',
                'bioswale',
                'green_roof'
            ];

            // This just validates the types compile correctly
            expect(validTypes.length).toBeGreaterThan(0);
        });
    });
});
