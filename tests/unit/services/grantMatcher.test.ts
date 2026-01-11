import { matchEligibleGrants, type ProjectForGrants, type Grant } from '../../../src/services/grantMatcher';

describe('Berlin Grant Matching', () => {
    const berlinProject: ProjectForGrants = {
        latitude: 52.52, longitude: 13.405, totalCostEUR: 15000,
        fixes: [{ type: 'rain_garden', size: 25 }, { type: 'permeable_pavement', size: 50 }],
        areaM2: 100,
    };

    it('matches BENE2 (<€100k) and KfW 432', () => {
        const grants = matchEligibleGrants(berlinProject);
        const bene2 = grants.find(g => g.id === 'bene2');
        const kfw = grants.find(g => g.id === 'kfw432');
        expect(bene2).toBeDefined();
        expect(bene2?.maxAmountEUR).toBe(7500);
        expect(kfw).toBeDefined();
    });

    it('matches EU Horizon only for projects >€50k', () => {
        expect(matchEligibleGrants(berlinProject).find(g => g.id === 'eu_horizon')).toBeUndefined();
        const largeProject = { ...berlinProject, totalCostEUR: 75000 };
        expect(matchEligibleGrants(largeProject).find(g => g.id === 'eu_horizon')).toBeDefined();
    });
});

describe('US Grant Matching', () => {
    const fairfaxProject: ProjectForGrants = {
        latitude: 38.8462, longitude: -77.3064, totalCostEUR: 20000,
        fixes: [{ type: 'rain_garden', size: 30 }], areaM2: 120,
    };

    it('matches FEMA grants and excludes Berlin grants', () => {
        const grants = matchEligibleGrants(fairfaxProject);
        expect(grants.find(g => g.id === 'fema_bric')).toBeDefined();
        expect(grants.find(g => g.id === 'fema_fma')).toBeDefined();
        expect(grants.filter(g => ['bene2', 'kfw432'].includes(g.id))).toHaveLength(0);
    });
});

describe('Grant Amount Calculation', () => {
    it('calculates max amount as percentage', () => {
        const project: ProjectForGrants = {
            latitude: 52.52, longitude: 13.405, totalCostEUR: 30000,
            fixes: [{ type: 'rain_garden', size: 25 }], areaM2: 100,
        };
        const grants = matchEligibleGrants(project);
        const bene2 = grants.find(g => g.id === 'bene2');
        expect(bene2?.maxAmountEUR).toBe(15000);
    });

    it('caps max amount at ceiling', () => {
        const hugeProject: ProjectForGrants = {
            latitude: 52.52, longitude: 13.405, totalCostEUR: 500000,
            fixes: [{ type: 'rain_garden', size: 100 }], areaM2: 500,
        };
        const grants = matchEligibleGrants(hugeProject);
        const bene2 = grants.find(g => g.id === 'bene2');
        expect(bene2?.maxAmountEUR).toBeLessThanOrEqual(100000);
    });
});

describe('Helper Functions', () => {
    it('formatGrantsForPDF returns correct strings', () => {
        const { formatGrantsForPDF } = require('../../../src/services/grantMatcher');
        const grants = [{
            name: 'Test Grant',
            maxFundingPercent: 50,
            maxAmountEUR: 1000
        }];
        expect(formatGrantsForPDF(grants)).toContain('• Test Grant: Up to 50% (max €1,000)');
        expect(formatGrantsForPDF([])).toContain('No matching funding programs');
    });
});

describe('Granular Region Checks', () => {
    it('handles EU boundary checks', () => {
        const { matchEligibleGrants } = require('../../../src/services/grantMatcher');
        // Spain (39/-4) -> EU but likely not Germany/Berlin specific
        const spainProject: ProjectForGrants = {
            latitude: 40.0, longitude: -3.0, totalCostEUR: 60000,
            fixes: [{ type: 'rain_garden', size: 10 }], areaM2: 100,
        };
        const grants = matchEligibleGrants(spainProject);
        // Should find EU Horizon if cost high enough
        expect(grants.find((g: Grant) => g.id === 'eu_horizon')).toBeDefined();
        // Should not find Berlin
        expect(grants.find((g: Grant) => g.id === 'bene2')).toBeUndefined();
    });

    it('checkKfw432 requires rain garden of size 20', () => {
        const { matchEligibleGrants } = require('../../../src/services/grantMatcher');
        const germanyProject: ProjectForGrants = {
            latitude: 50.0, longitude: 10.0, totalCostEUR: 1000,
            fixes: [{ type: 'rain_garden', size: 10 }], areaM2: 100, // < 20
        };
        const grants = matchEligibleGrants(germanyProject);
        expect(grants.find((g: Grant) => g.id === 'kfw432')).toBeUndefined();
    });
});
