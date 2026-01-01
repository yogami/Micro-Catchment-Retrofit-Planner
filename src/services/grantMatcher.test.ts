import { matchEligibleGrants, type Grant, type ProjectForGrants } from './grantMatcher';

describe('Grant Matcher Service', () => {
    describe('Berlin Projects', () => {
        const berlinProject: ProjectForGrants = {
            latitude: 52.52,
            longitude: 13.405,
            totalCostEUR: 15000,
            fixes: [
                { type: 'rain_garden', size: 25 },
                { type: 'permeable_pavement', size: 50 },
            ],
            areaM2: 100,
        };

        it('matches BENE2 for Berlin projects under €100k', () => {
            const grants = matchEligibleGrants(berlinProject);
            const bene2 = grants.find(g => g.id === 'bene2');

            expect(bene2).toBeDefined();
            expect(bene2?.name).toBe('BENE2 Berliner Programm');
            expect(bene2?.maxFundingPercent).toBe(50);
            expect(bene2?.maxAmountEUR).toBe(7500); // 50% of 15000
        });

        it('matches KfW 432 for rain gardens over 20m²', () => {
            const grants = matchEligibleGrants(berlinProject);
            const kfw = grants.find(g => g.id === 'kfw432');

            expect(kfw).toBeDefined();
            expect(kfw?.name).toContain('KfW');
        });

        it('matches EU Horizon for projects over €50k', () => {
            const largeProject: ProjectForGrants = {
                ...berlinProject,
                totalCostEUR: 75000,
            };

            const grants = matchEligibleGrants(largeProject);
            const horizon = grants.find(g => g.id === 'eu_horizon');

            expect(horizon).toBeDefined();
            expect(horizon?.fundingType).toBe('Innovation Action');
        });

        it('does NOT match EU Horizon for small projects', () => {
            const grants = matchEligibleGrants(berlinProject);
            const horizon = grants.find(g => g.id === 'eu_horizon');

            expect(horizon).toBeUndefined();
        });
    });

    describe('US Projects (Fairfax, VA)', () => {
        const fairfaxProject: ProjectForGrants = {
            latitude: 38.8462,
            longitude: -77.3064,
            totalCostEUR: 20000,
            fixes: [
                { type: 'rain_garden', size: 30 },
            ],
            areaM2: 120,
        };

        it('matches FEMA BRIC for US flood mitigation', () => {
            const grants = matchEligibleGrants(fairfaxProject);
            const bric = grants.find(g => g.id === 'fema_bric');

            expect(bric).toBeDefined();
            expect(bric?.name).toBe('FEMA BRIC');
            expect(bric?.maxFundingPercent).toBe(75);
        });

        it('matches FEMA FMA for US projects', () => {
            const grants = matchEligibleGrants(fairfaxProject);
            const fma = grants.find(g => g.id === 'fema_fma');

            expect(fma).toBeDefined();
        });

        it('does NOT match Berlin grants for US projects', () => {
            const grants = matchEligibleGrants(fairfaxProject);
            const berlinGrants = grants.filter(g =>
                g.id === 'bene2' || g.id === 'kfw432' || g.id === 'berlin_umwelt'
            );

            expect(berlinGrants).toHaveLength(0);
        });
    });

    describe('Grant Amount Calculation', () => {
        it('calculates max amount as percentage of project cost', () => {
            const project: ProjectForGrants = {
                latitude: 52.52,
                longitude: 13.405,
                totalCostEUR: 30000,
                fixes: [{ type: 'rain_garden', size: 25 }],
                areaM2: 100,
            };

            const grants = matchEligibleGrants(project);
            const bene2 = grants.find(g => g.id === 'bene2');

            expect(bene2?.maxAmountEUR).toBe(15000); // 50% of 30000
        });

        it('caps max amount at program ceiling', () => {
            const hugeProject: ProjectForGrants = {
                latitude: 52.52,
                longitude: 13.405,
                totalCostEUR: 500000,
                fixes: [{ type: 'rain_garden', size: 100 }],
                areaM2: 500,
            };

            const grants = matchEligibleGrants(hugeProject);
            const bene2 = grants.find(g => g.id === 'bene2');

            // BENE2 caps at €100,000
            expect(bene2?.maxAmountEUR).toBeLessThanOrEqual(100000);
        });
    });
});
