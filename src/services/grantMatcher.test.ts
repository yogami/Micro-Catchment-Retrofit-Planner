import { matchEligibleGrants, type ProjectForGrants } from './grantMatcher';

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
