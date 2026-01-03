/**
 * Grant Matcher Service
 * Matches retrofit projects to eligible funding programs based on location and project parameters
 */

export interface ProjectForGrants {
    latitude: number;
    longitude: number;
    totalCostEUR: number;
    fixes: Array<{ type: string; size: number }>;
    areaM2: number;
}

export interface Grant {
    id: string;
    name: string;
    region: 'berlin' | 'germany' | 'eu' | 'usa';
    maxFundingPercent: number;
    maxAmountEUR: number;
    programCeiling?: number;
    fundingType?: string;
    deadline?: string;
    url?: string;
    requirements?: string[];
}

// Grant Database (hardcoded for MVP, could be API-driven later)
const GRANT_PROGRAMS: Omit<Grant, 'maxAmountEUR'>[] = [
    // Berlin Programs
    {
        id: 'bene2',
        name: 'BENE2 Berliner Programm',
        region: 'berlin',
        maxFundingPercent: 50,
        programCeiling: 100000,
        fundingType: 'Co-funding',
        deadline: '2027-12-31',
        url: 'https://www.berlin.de/sen/uvk/umwelt/foerderprogramme/bene/',
        requirements: ['Green infrastructure', 'Berlin location', 'Climate adaptation'],
    },
    {
        id: 'kfw432',
        name: 'KfW 432 Energetische Stadtsanierung',
        region: 'germany',
        maxFundingPercent: 40,
        programCeiling: 200000,
        fundingType: 'Low-interest loan + grant',
        url: 'https://www.kfw.de/inlandsfoerderung/Kommunen/Stadtsanierung/',
        requirements: ['Rain garden >20m²', 'Urban renewal area'],
    },
    {
        id: 'berlin_umwelt',
        name: 'Berlin Umweltentlastungsprogramm',
        region: 'berlin',
        maxFundingPercent: 30,
        programCeiling: 50000,
        fundingType: 'Direct grant',
        url: 'https://www.berlin.de/sen/uvk/umwelt/foerderprogramme/',
        requirements: ['Environmental benefit', 'Berlin-based'],
    },
    // EU Programs
    {
        id: 'eu_horizon',
        name: 'EU Horizon Europe',
        region: 'eu',
        maxFundingPercent: 70,
        programCeiling: 500000,
        fundingType: 'Innovation Action',
        deadline: '2025-09-15',
        url: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/',
        requirements: ['Project >€50k', 'Innovation component', 'EU location'],
    },
    // US Programs (for brother's testing)
    {
        id: 'fema_bric',
        name: 'FEMA BRIC',
        region: 'usa',
        maxFundingPercent: 75,
        programCeiling: 500000,
        fundingType: 'Hazard Mitigation Grant',
        url: 'https://www.fema.gov/grants/mitigation/building-resilient-infrastructure-communities',
        requirements: ['Flood mitigation', 'US location', 'Local government sponsor'],
    },
    {
        id: 'fema_fma',
        name: 'FEMA FMA',
        region: 'usa',
        maxFundingPercent: 75,
        programCeiling: 200000,
        fundingType: 'Flood Mitigation Assistance',
        url: 'https://www.fema.gov/grants/mitigation/floods',
        requirements: ['Flood mitigation', 'NFIP participation'],
    },
];

function isLatInBerlin(lat: number): boolean {
    return lat >= 52.3 && lat <= 52.7;
}

function isLonInBerlin(lon: number): boolean {
    return lon >= 13.0 && lon <= 13.8;
}

/**
 * Determine if coordinates are in Berlin
 */
function isInBerlin(lat: number, lon: number): boolean {
    return isLatInBerlin(lat) && isLonInBerlin(lon);
}

function isLatInGermany(lat: number): boolean {
    return lat >= 47.2 && lat <= 55.1;
}

function isLonInGermany(lon: number): boolean {
    return lon >= 5.8 && lon <= 15.1;
}

/**
 * Determine if coordinates are in Germany (but not Berlin)
 */
function isInGermany(lat: number, lon: number): boolean {
    return isLatInGermany(lat) && isLonInGermany(lon);
}

function isLatInUSA(lat: number): boolean {
    return lat >= 24.5 && lat <= 49.5;
}

function isLonInUSA(lon: number): boolean {
    return lon >= -125.0 && lon <= -66.0;
}

/**
 * Determine if coordinates are in the USA
 */
function isInUSA(lat: number, lon: number): boolean {
    return isLatInUSA(lat) && isLonInUSA(lon);
}

function isLatInEU(lat: number): boolean {
    return lat >= 35.0 && lat <= 71.0;
}

function isLonInEU(lon: number): boolean {
    return lon >= -10.0 && lon <= 40.0;
}

/**
 * Determine if coordinates are in EU
 */
function isInEU(lat: number, lon: number): boolean {
    return isLatInEU(lat) && isLonInEU(lon);
}

function checkRegion(region: string, lat: number, lon: number): boolean {
    const checkers: Record<string, (lt: number, ln: number) => boolean> = {
        berlin: isInBerlin,
        germany: (lt, ln) => isInGermany(lt, ln) || isInBerlin(lt, ln),
        eu: isInEU,
        usa: isInUSA
    };
    return checkers[region]?.(lat, lon) ?? false;
}

function checkKfw432(project: ProjectForGrants): boolean {
    return project.fixes.some(f => f.type === 'rain_garden' && f.size >= 20);
}

function checkEuHorizon(project: ProjectForGrants): boolean {
    return project.totalCostEUR >= 50000;
}

/**
 * Check if project meets grant requirements
 */
function meetsRequirements(project: ProjectForGrants, grant: Omit<Grant, 'maxAmountEUR'>): boolean {
    const { latitude, longitude } = project;

    if (!checkRegion(grant.region, latitude, longitude)) {
        return false;
    }

    const evaluators: Record<string, (p: ProjectForGrants) => boolean> = {
        kfw432: checkKfw432,
        eu_horizon: checkEuHorizon
    };

    const evaluator = evaluators[grant.id];
    return evaluator ? evaluator(project) : true;
}

/**
 * Calculate max funding amount for a grant
 */
function calculateMaxAmount(project: ProjectForGrants, grant: Omit<Grant, 'maxAmountEUR'>): number {
    const percentageAmount = project.totalCostEUR * (grant.maxFundingPercent / 100);

    if (grant.programCeiling) {
        return Math.min(percentageAmount, grant.programCeiling);
    }

    return percentageAmount;
}

/**
 * Match a project to eligible grants
 */
export function matchEligibleGrants(project: ProjectForGrants): Grant[] {
    const eligibleGrants: Grant[] = [];

    for (const grantTemplate of GRANT_PROGRAMS) {
        if (meetsRequirements(project, grantTemplate)) {
            const maxAmountEUR = calculateMaxAmount(project, grantTemplate);
            eligibleGrants.push({
                ...grantTemplate,
                maxAmountEUR,
            });
        }
    }

    // Sort by max amount descending
    return eligibleGrants.sort((a, b) => b.maxAmountEUR - a.maxAmountEUR);
}

/**
 * Format grants for PDF export
 */
export function formatGrantsForPDF(grants: Grant[]): string {
    if (grants.length === 0) {
        return 'No matching funding programs found for this location.';
    }

    return grants
        .map(g => `• ${g.name}: Up to ${g.maxFundingPercent}% (max €${g.maxAmountEUR.toLocaleString()})`)
        .join('\n');
}
