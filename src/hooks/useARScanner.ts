import { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SfMOptimizer, type OptimizationResult } from '../utils/ar/SfMOptimizer';
import { useAuth } from '../contexts/AuthContext';
import { useUnitStore } from '../store/useUnitStore';
import {
    calculateTotalReduction
} from '../utils/hydrology';
import { parseArea } from '../utils/units';
import {
    STORMWATER_PROFILES,
    type StormwaterParameters,
    type JurisdictionChain,
    type DiscoveryResult,
    createStormwaterDiscoveryUseCase
} from '../lib/geo-regulatory';
import { type PollutantLoadResult, type PollutantCalculationService, createPollutantService } from '../lib/env-calculator';
import { type ComplianceResult, type GrantPDFService, type GrantApplicationData, createGrantPDFService } from '../lib/grant-generator';
import type { GreenFix } from '../utils/hydrology';

import { useScannerLocation } from './scanner/useScannerLocation';
import { useScannerDemo } from './scanner/useScannerDemo';
import { useScannerHydrology } from './scanner/useScannerHydrology';
import { useScannerCompliance } from './scanner/useScannerCompliance';
import { type ElevationGrid, type GeoPolygon } from '../lib/spatial-coverage';

export type DepthMode = 'lidar' | 'visual-slam' | 'initializing';

export type ScanPhase = 'onboarding' | 'planning' | 'scanning' | 'drone_upload';

export interface ARScannerState {
    isScanning: boolean;
    detectedArea: number | null;
    rainfall: number;
    isLoadingRainfall: boolean;
    fixes: GreenFix[];
    showAR: boolean;
    location: { lat: number; lon: number } | null;
    locationName: string;
    cameraError: string | null;
    isDetecting: boolean;
    scanProgress: number;
    isLocked: boolean;
    intensityMode: 'auto' | 'manual';
    manualIntensity: number;
    activeProfile: typeof STORMWATER_PROFILES[0];
    sizingMode: 'rate' | 'volume';
    manualDepth: number;
    discoveryStatus: 'idle' | 'discovering' | 'ready';
    jurisdictionChain: JurisdictionChain | null;
    discoveryResult: DiscoveryResult<StormwaterParameters> | null;
    pollutantResult: PollutantLoadResult | null;
    complianceResults: ComplianceResult[];
    isGeneratingPDF: boolean;
    peakRunoff: number;
    wqv: number;
    isPinnActive: boolean;
    // Field Validation State
    optimizationResult: OptimizationResult | null;
    tapeValidation: number | null; // Manual tape measure input (m²)
    validationError: number | null; // Percentage error vs tape
    // Depth Sensing State
    depthMode: DepthMode;
    accuracyLabel: string;
    // Map-Guided AR Phase State
    scanPhase: ScanPhase;
    geoBoundary: GeoPolygon | null;
    elevationGrid: ElevationGrid | null;
    voxels: string[]; // Voxel keys for visualization
}

export interface Services {
    discovery: ReturnType<typeof createStormwaterDiscoveryUseCase>;
    pollutant: PollutantCalculationService;
    pdf: GrantPDFService;
}

export type UpdateFn = (u: Partial<ARScannerState>) => void;

/**
 * useARScanner - Primary orchestration hook for the AR Scanner module.
 * Delegates specialized logic to sub-hooks to maintain ≤ 3 cyclomatic complexity.
 */
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
        complianceResults: [], isGeneratingPDF: false, peakRunoff: 0, wqv: 0, isPinnActive: false,
        optimizationResult: null, tapeValidation: null, validationError: null,
        depthMode: 'initializing', accuracyLabel: 'Initializing...',
        scanPhase: 'onboarding', geoBoundary: null, elevationGrid: null,
        voxels: []
    });

    const update = useCallback((u: Partial<ARScannerState>) => setState(s => ({ ...s, ...u })), []);

    const services = useMemo<Services>(() => ({
        discovery: createStormwaterDiscoveryUseCase(),
        pollutant: createPollutantService(),
        pdf: createGrantPDFService()
    }), []);

    // Refs for optimization (accessed by handlers)
    const sfmOptimizerRef = useRef(new SfMOptimizer());

    // Specialist Hooks (Decomposition of the god-hook)
    useScannerLocation(demoScenario, update, state.location, services.discovery, setUnitSystem);
    useScannerDemo(demoScenario, state.isScanning, update, services.discovery, setUnitSystem);
    useScannerHydrology(state, update);
    useScannerCompliance(state, services, update);

    const handleLogout = useCallback(async () => {
        await signOut();
        navigate('/');
    }, [signOut, navigate]);

    const handleGenerateGrant = useCallback((gid: string) => {
        startGrantGeneration(gid, state, services, update);
    }, [state, services, update]);

    const handleOptimizeSweep = useCallback(() => {
        if (state.detectedArea === null) return;
        const result = sfmOptimizerRef.current.optimize(state.detectedArea);
        update({
            optimizationResult: result,
            detectedArea: result.optimizedArea
        });
    }, [state.detectedArea, update]);

    const handleValidateTape = useCallback((tapeValue: number) => {
        if (state.detectedArea === null || tapeValue <= 0) return;
        const tapeValueM2 = parseArea(Math.abs(tapeValue), unitSystem);
        const errorPercent = Math.abs(state.detectedArea - tapeValueM2) / tapeValueM2 * 100;
        update({
            tapeValidation: tapeValueM2,
            validationError: Math.round(errorPercent * 100) / 100
        });
    }, [state.detectedArea, update, unitSystem]);

    return useMemo(() => ({
        ...state,
        user,
        unitSystem,
        toggleUnitSystem,
        update,
        handleLogout,
        handleGenerateGrant,
        navigate,
        handleOptimizeSweep,
        handleValidateTape
    }), [
        state, user, unitSystem, toggleUnitSystem, update,
        handleLogout, handleGenerateGrant, navigate,
        handleOptimizeSweep, handleValidateTape
    ]);
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
