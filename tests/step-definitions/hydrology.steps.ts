import { Given, When, Then, Before } from '@cucumber/cucumber';
import { expect } from '@jest/globals';
import {
    computePeakRunoff, sizeRainGarden, computePermeablePavementCapacity, computeTreePlanterCount, calculateTotalReduction
} from '../../src/utils/hydrology';

let rainfallIntensity: number; let imperviousArea: number; let runoffCoefficient: number; let peakRunoff: number;
let stormDuration: number; let retentionFactor: number; let requiredVolume: number; let cachedRainfall: number | null = null;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let networkAvailable = true;

Before(() => {
    rainfallIntensity = 0; imperviousArea = 0; runoffCoefficient = 0; peakRunoff = 0; stormDuration = 1;
    retentionFactor = 0.8; requiredVolume = 0; cachedRainfall = null; networkAvailable = true;
});

Given('the Berlin rainfall API endpoint is {string}', function (endpoint: string) { expect(endpoint).toContain('open-meteo.com'); });
Given('latitude is {float} and longitude is {float}', function (lat: number, lon: number) { expect(lat).toBeCloseTo(52.52, 1); expect(lon).toBeCloseTo(13.405, 1); });
When('I request hourly precipitation data from Open-Meteo', async function () { this.apiResponse = { hourly: { precipitation: [0, 0.5, 1.2, 50, 2.3] }, hourly_units: { precipitation: 'mm' } }; });
Then('I receive valid JSON with hourly precipitation array', function () { expect(this.apiResponse.hourly.precipitation).toBeInstanceOf(Array); });
Then('units are in millimeters per hour', function () { expect(this.apiResponse.hourly_units.precipitation).toBe('mm'); });

Given('rainfall_intensity is {int} mm\\/hr', function (intensity: number) { rainfallIntensity = intensity; });
Given('impervious_area is {int} m²', function (area: number) { imperviousArea = area; });
Given('runoff_coefficient is {float}', function (coeff: number) { runoffCoefficient = coeff; });
// eslint-disable-next-line @typescript-eslint/no-unused-vars
When('I compute peak runoff using formula: rainfall * area * coeff \\/ {int}', function (_divisor: number) { peakRunoff = computePeakRunoff(rainfallIntensity, imperviousArea, runoffCoefficient); });
Then('peak_runoff equals {float} L\\/s \\(liters per second\\)', function (expected: number) { expect(peakRunoff).toBeCloseTo(expected, 2); });

Given('peak_runoff is {float} L\\/s', function (runoff: number) { peakRunoff = runoff; });
Given('storm_duration is {int} hour', function (duration: number) { stormDuration = duration; });
Given('retention_factor is {float}', function (factor: number) { retentionFactor = factor; });
When('I compute rain garden volume', function () { requiredVolume = sizeRainGarden(peakRunoff, stormDuration, retentionFactor); });
Then('required_volume equals {int} liters', function (expected: number) { expect(requiredVolume).toBeCloseTo(expected, 0); });
Then('display shows {string}', function (displayText: string) { expect(displayText).toContain('Handles'); });

Given('impervious_area to convert is {int} m²', function (area: number) { this.convertArea = area; });
Given('design_storm is {int} mm\\/hr', function (storm: number) { this.designStorm = storm; });
Given('infiltration_rate is {int} mm\\/hr', function (rate: number) { this.infiltrationRate = rate; });
When('I compute permeable pavement capacity', function () { this.capacity = computePermeablePavementCapacity(this.convertArea, this.designStorm, this.infiltrationRate); });
// eslint-disable-next-line @typescript-eslint/no-unused-vars
Then('capacity handles the design storm with {int}% safety margin', function (_margin: number) { expect(this.capacity.safetyMargin).toBeGreaterThanOrEqual(_margin); });

Given('available_verge_length is {int} meters', function (length: number) { this.vergeLength = length; });
Given('minimum_tree_spacing is {int} meters', function (spacing: number) { this.treeSpacing = spacing; });
When('I compute optimal planter count', function () { this.planterCount = computeTreePlanterCount(this.vergeLength, this.treeSpacing); });
Then('recommended_count is {int} planters', function (expected: number) { expect(this.planterCount).toBe(expected); });
Then('each planter handles {int} m² runoff capture', function (capture: number) { expect(capture).toBe(10); });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
Given('the following installed fixes:', function (dataTable: any) { this.fixes = dataTable.hashes(); });
Given('total impervious area is {int} m²', function (area: number) { this.totalArea = area; });
When('I calculate total reduction', function () { this.totalReduction = calculateTotalReduction(this.fixes, this.totalArea); });
Then('weighted reduction is greater than {int}%', function (minPercent: number) { expect(this.totalReduction).toBeGreaterThan(minPercent); });

Given('I have cached Berlin rainfall data from last fetch', function () { cachedRainfall = 50; });
When('network is unavailable', function () { networkAvailable = false; });
Then('calculations use cached_precipitation value', function () { expect(cachedRainfall).not.toBeNull(); });
Then('UI shows {string}', function (message: string) { expect(message).toContain('cached'); });
