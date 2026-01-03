import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUnitStore } from '../store/useUnitStore';
import { openMeteoClient } from '../services/openMeteoClient';
import {
    suggestGreenFixes,
    calculateTotalReduction,
    computePeakRunoff,
    computeRunoffWithPINN,
    computeWQv
} from '../utils/hydrology';
import {
    createStormwaterDiscoveryUseCase,
    STORMWATER_PROFILES,
    type StormwaterParameters,
    type JurisdictionChain,
    type DiscoveryResult
} from '../lib/geo-regulatory';
import { createPollutantService, type PollutantLoadResult, type PollutantCalculationService, type BMPSpec } from '../lib/env-calculator';
import { createGrantPDFService, type ComplianceResult, type GrantPDFService, type GrantApplicationData } from '../lib/grant-generator';
import type { GreenFix } from '../utils/hydrology';

export interface ARScannerState {
    isScanning: boolean; detectedArea: number | null; rainfall: number; isLoadingRainfall: boolean;
    fixes: GreenFix[]; showAR: boolean; location: { lat: number; lon: number } | null;
    locationName: string; cameraError: string | null; isDetecting: boolean;
    scanProgress: number; isLocked: boolean; intensityMode: 'auto' | 'manual';
    manualIntensity: number; activeProfile: typeof STORMWATER_PROFILES[0];
    sizingMode: 'rate' | 'volume'; manualDepth: number; discoveryStatus: 'idle' | 'discovering' | 'ready';
    jurisdictionChain: JurisdictionChain | null; discoveryResult: DiscoveryResult<StormwaterParameters> | null;
    pollutantResult: PollutantLoadResult | null; complianceResults: ComplianceResult[];
    isGeneratingPDF: boolean; peakRunoff: number; wqv: number; isPinnActive: boolean;
}

export interface Services {
    discovery: ReturnType<typeof createStormwaterDiscoveryUseCase>;
    pollutant: PollutantCalculationService;
    pdf: GrantPDFService;
}

export type UpdateFn = (u: Partial<ARScannerState>) => void;

interface EffectProps {
    state: ARScannerState;
    demo: string | undefined;
    update: UpdateFn;
    services: Services;
    setUnits: (u: 'metric' | 'imperial') => void;
}

export function useARScanner() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const locationState = useLocation();
    const { unitSystem, toggleUnitSystem, setUnitSystem } = useUnitStore();
    const demoScenario = locationState.state?.demoScenario;

    const [state, setState] = useState<ARScannerState>({
        isScanning: false, detectedArea: null, rainfall: 50, isLoadingRainfall: true,
        fixes: [], showAR: false, location: null, locationName: 'Current Project',
        cameraError: null, isDetecting: false, scanProgress: 0, isLocked: false,
        intensityMode: 'auto', manualIntensity: 50, activeProfile: STORMWATER_PROFILES[0],
        sizingMode: 'rate', manualDepth: 30.48, discoveryStatus: 'idle',
        jurisdictionChain: null, discoveryResult: null, pollutantResult: null,
        complianceResults: [], isGeneratingPDF: false, peakRunoff: 0, wqv: 0, isPinnActive: false
    });

    const update = useCallback((u: Partial<ARScannerState>) => setState(s => ({ ...s, ...u })), []);
    const services = useMemo<Services>(() => ({
        discovery: createStormwaterDiscoveryUseCase(), pollutant: createPollutantService(), pdf: createGrantPDFService()
    }), []);

    useScannerEffects({ state, demo: demoScenario, update, services, setUnits: setUnitSystem });

    const handleLogout = async () => { await signOut(); navigate('/'); };
    const handleGenerateGrant = (gid: string) => startGrantGeneration(gid, state, services, update);

    return { ...state, user, unitSystem, toggleUnitSystem, update, handleLogout, handleGenerateGrant, navigate };
}

function useScannerEffects({ state, demo, update, services, setUnits }: EffectProps) {
    useLocationEffect(demo, update);
    useDemoEffect({ demo, isScanning: state.isScanning, update, discovery: services.discovery, setUnits });
    useProfileEffect({ loc: state.location, demo, discovery: services.discovery, update, setUnits });
    useHydrologyEffect(state, update);
    useComplianceEffect(state, services, update);
    useScanEffect(state, update);
}

function useLocationEffect(demo: string | undefined, update: UpdateFn) {
    useEffect(() => {
        if (demo) return;
        async function init() {
            update({ isLoadingRainfall: true });
            const lat = 52.52, lon = 13.405;
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    async (pos) => { handleLoc(pos.coords.latitude, pos.coords.longitude, update); },
                    async () => { handleLoc(lat, lon, update); }
                );
            }
        }
        init();
    }, [demo, update]);
}

async function handleLoc(lat: number, lon: number, update: UpdateFn) {
    const storm = await openMeteoClient.getDesignStorm(lat, lon);
    update({ location: { lat, lon }, rainfall: storm, isLoadingRainfall: false });
}

function useDemoEffect({ demo, isScanning, update, discovery, setUnits }: {
    demo: string | undefined; isScanning: boolean; update: UpdateFn; discovery: Services['discovery']; setUnits: (u: 'metric' | 'imperial') => void;
}) {
    useEffect(() => {
        if (!demo || isScanning) return;
        async function start() {
            update({ isLoadingRainfall: true });
            const coords = demo === 'berlin' ? { lat: 52.52, lon: 13.405, name: 'Berlin' } : { lat: 38.8462, lon: -77.3064, name: 'Fairfax, VA' };
            const res = await discovery.execute({ latitude: coords.lat, longitude: coords.lon, domain: 'stormwater' }) as DiscoveryResult<StormwaterParameters>;
            const storm = await openMeteoClient.getDesignStorm(coords.lat, coords.lon);
            update({
                location: { lat: coords.lat, lon: coords.lon }, locationName: coords.name, rainfall: storm, isLoadingRainfall: false,
                isScanning: true, isLocked: true, detectedArea: demo === 'fairfax' ? 120 : 80,
                activeProfile: res.profile, jurisdictionChain: res.chain, discoveryResult: res,
                manualIntensity: res.profile.parameters.designIntensity_mm_hr, manualDepth: res.profile.parameters.designDepth_mm
            });
            setUnits(res.profile.parameters.units);
        }
        start();
    }, [demo, isScanning, update, discovery, setUnits]);
}

function useProfileEffect({ loc, demo, discovery, update, setUnits }: {
    loc: { lat: number; lon: number } | null; demo: string | undefined; discovery: Services['discovery']; update: UpdateFn; setUnits: (u: 'metric' | 'imperial') => void;
}) {
    useEffect(() => {
        if (!loc || demo) return;
        update({ discoveryStatus: 'discovering' });
        discovery.execute({ latitude: loc.lat, longitude: loc.lon, domain: 'stormwater' })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then((rawRes: any) => {
                const res = rawRes as DiscoveryResult<StormwaterParameters>;
                update({
                    activeProfile: res.profile, jurisdictionChain: res.chain, discoveryResult: res, discoveryStatus: 'ready',
                    manualIntensity: res.profile.parameters.designIntensity_mm_hr, manualDepth: res.profile.parameters.designDepth_mm
                });
                if (res.status !== 'default') setUnits(res.profile.parameters.units);
            }).catch(() => update({ discoveryStatus: 'ready' }));
    }, [loc, demo, discovery, update, setUnits]);
}

function useHydrologyEffect(state: ARScannerState, update: UpdateFn) {
    useEffect(() => {
        if (!state.detectedArea) return;
        const currentIntensity = state.intensityMode === 'auto' ? state.rainfall : state.manualIntensity;
        async function calc() {
            try {
                const q = await computeRunoffWithPINN(currentIntensity, state.detectedArea!);
                update({ peakRunoff: q, isPinnActive: true });
            } catch {
                const rv = state.activeProfile.parameters.rvFormula(100);
                update({ peakRunoff: computePeakRunoff(currentIntensity, state.detectedArea!, rv), isPinnActive: false });
            }
            update({
                wqv: computeWQv(state.manualDepth, state.detectedArea!, state.activeProfile.parameters.rvFormula(100)),
                fixes: suggestGreenFixes(state.detectedArea!)
            });
        }
        calc();
    }, [state.detectedArea, state.rainfall, state.intensityMode, state.manualIntensity, state.manualDepth, state.activeProfile, update]);
}

function useComplianceEffect(state: ARScannerState, services: Services, update: UpdateFn) {
    useEffect(() => {
        if (!state.detectedArea || state.fixes.length === 0) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bmps: BMPSpec[] = state.fixes.map((f: GreenFix) => ({ type: f.type as any, area_m2: f.size }));
        const pollutantRes = services.pollutant.calculateWithBMPs({
            area_m2: state.detectedArea, imperviousPercent: 100, annualRainfall_mm: 1000, bmps: bmps
        });
        update({ pollutantResult: pollutantRes });

        const grants = getGrants(state.activeProfile.jurisdictionCode);
        const results = grants.map(gid => services.pdf.complianceService.checkCompliance({
            jurisdictionCode: state.activeProfile.jurisdictionCode,
            jurisdictionChain: state.jurisdictionChain?.hierarchy.map(j => j.name) || [], area_m2: state.detectedArea!,
            retention_in: state.manualDepth / 25.4, peakReduction_percent: calculateTotalReduction(state.fixes, state.detectedArea!),
            hasBCR: true, bcrValue: 1.8, hasResiliencePlan: true, bmps: bmps, phosphorusRemoval_lb_yr: pollutantRes.phosphorus_lb_yr
        }, gid));
        update({ complianceResults: results as ComplianceResult[] });
    }, [state.detectedArea, state.fixes, state.activeProfile, state.manualDepth, state.jurisdictionChain, update, services]);
}

function getGrants(code: string): Array<'CFPF' | 'SLAF' | 'BRIC' | 'BENE2'> {
    const grants: Array<'CFPF' | 'SLAF' | 'BRIC' | 'BENE2'> = ['CFPF', 'SLAF', 'BRIC'];
    if (code.startsWith('DE-BE')) grants.push('BENE2');
    return grants;
}

function useScanEffect(state: ARScannerState, update: UpdateFn) {
    const active = state.isDetecting && state.isScanning && !state.isLocked;
    useEffect(() => {
        if (!active) return;
        const interval = setInterval(() => {
            const area = (state.detectedArea || 0) + (Math.random() * 5 + 2);
            update({ detectedArea: area, scanProgress: Math.min(state.scanProgress + 2, 100) });
        }, 100);
        return () => clearInterval(interval);
    }, [active, state.detectedArea, state.scanProgress, update]);
}

async function startGrantGeneration(gid: string, state: ARScannerState, services: Services, update: UpdateFn) {
    update({ isGeneratingPDF: true });
    try {
        const payload = buildGrantPayload(state);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdf = await services.pdf.generate(payload, gid as any);
        services.pdf.download(pdf);
    } finally { update({ isGeneratingPDF: false }); }
}

function buildGrantPayload(state: ARScannerState): GrantApplicationData {
    return {
        project: buildProjectData(state),
        geo: buildGeoData(state),
        pollutants: buildPollutantsData(state),
        bmps: buildBMPsData(state),
        hasResiliencePlan: true
    };
}

function buildProjectData(state: ARScannerState) {
    return {
        name: `${state.activeProfile.jurisdictionCode} Retrofit Plan`,
        area_m2: state.detectedArea || 0,
        retention_in: state.manualDepth / 25.4,
        retention_mm: state.manualDepth,
        peakReduction_percent: calculateTotalReduction(state.fixes, state.detectedArea!),
        bcrValue: 1.8
    };
}

function buildGeoData(state: ARScannerState) {
    return {
        hierarchy: state.jurisdictionChain?.hierarchy.map((j) => j.name) || [],
        jurisdictionCode: state.activeProfile.jurisdictionCode,
        watershed: 'Local Catchment'
    };
}

function buildPollutantsData(state: ARScannerState) {
    if (!state.pollutantResult) return { TP: 0, TN: 0, sediment: 0 };
    return {
        TP: state.pollutantResult.phosphorus_lb_yr,
        TN: state.pollutantResult.nitrogen_lb_yr,
        sediment: state.pollutantResult.sediment_percent
    };
}

function buildBMPsData(state: ARScannerState) {
    return state.fixes.map((f: GreenFix) => ({ type: f.type, area_m2: f.size }));
}
