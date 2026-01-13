import { useARScanner } from '../hooks/useARScanner';
import { DemoOverlay } from './DemoOverlay';
import { useDemoState } from '../hooks/useDemoState';
import { ScannerHeader } from './scanner/ScannerHeader';
import { OnboardingView } from './scanner/OnboardingView';
import { ARView } from './scanner/ARView';
import { AnalysisPanel } from './scanner/AnalysisPanel';
import { MapBoundaryView } from './scanner/map/MapBoundaryView';
import { DroneUploadView } from './scanner/drone/DroneUploadView';
import { type GeoPolygon } from '../lib/spatial-coverage/domain/valueObjects/GeoPolygon';
import React, { useCallback } from 'react';

type ScannerHook = ReturnType<typeof useARScanner>;

const MemoScannerHeader = React.memo(ScannerHeader);
const MemoOnboardingView = React.memo(OnboardingView);

export function ARScanner() {
    const scanner = useARScanner();
    const { showDemo, completeDemo, skipDemo } = useDemoState();

    return (
        <div className="min-h-screen bg-gray-900 text-white" data-jurisdiction-code={scanner.activeProfile.jurisdictionCode}>
            {showDemo && <DemoOverlay onComplete={completeDemo} onSkip={skipDemo} />}
            <MemoScannerHeader scanner={scanner} />
            <ScannerMain scanner={scanner} />
            <DebugDashboard scanner={scanner} />
        </div>
    );
}

function DebugDashboard({ scanner }: { scanner: any }) {
    const isScanning = scanner.scanPhase === 'scanning';
    return (
        <div className="fixed top-20 left-4 z-[100] bg-black/80 backdrop-blur p-3 rounded-2xl border border-white/10 font-mono text-[9px] pointer-events-none shadow-2xl">
            <p className="text-gray-500 mb-2 font-black uppercase tracking-tighter flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Diagnostics
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-gray-400">Phase:</span>
                <span className="text-white uppercase">{scanner.scanPhase}</span>
                <span className="text-gray-400">Camera:</span>
                <span className={scanner.cameraError ? 'text-red-400' : 'text-emerald-400'}>
                    {scanner.cameraError ? 'ERROR' : 'READY'}
                </span>
                <span className="text-gray-400">Area M2:</span>
                <span className="text-cyan-400">{scanner.detectedArea?.toFixed(2) || '0.00'}</span>
                <span className="text-gray-400">Progress:</span>
                <span className="text-emerald-400">{scanner.scanProgress.toFixed(0)}%</span>
                {isScanning && (
                    <>
                        <span className="text-gray-400">Sim Mode:</span>
                        <span className="text-yellow-400">ACTIVE</span>
                    </>
                )}
            </div>
        </div>
    );
}

function ScannerMain({ scanner }: { scanner: ScannerHook }) {
    return (
        <main className="pt-16 pb-24">
            <ScannerBody scanner={scanner} />
        </main>
    );
}

function ScannerBody({ scanner }: { scanner: ScannerHook }) {
    const handleBoundaryConfirmed = useCallback((polygon: GeoPolygon) => {
        scanner.update({
            geoBoundary: polygon,
            scanPhase: 'scanning',
            isScanning: true
        });
    }, [scanner]);

    const handleCancelPlanning = useCallback(() => {
        scanner.update({ scanPhase: 'onboarding' });
    }, [scanner]);

    // Phase-based rendering
    switch (scanner.scanPhase) {
        case 'onboarding':
            return <MemoOnboardingView scanner={scanner} />;
        case 'planning':
            return (
                <div className="h-[calc(100vh-8rem)]">
                    <MapBoundaryView
                        onBoundaryConfirmed={handleBoundaryConfirmed}
                        onCancel={handleCancelPlanning}
                        minVertices={4}
                        maxVertices={8}
                    />
                </div>
            );
        case 'scanning':
            return <ScanningInterface scanner={scanner} />;
        case 'drone_upload':
            return <DroneUploadView scanner={scanner} />;
        default:
            return <MemoOnboardingView scanner={scanner} />;
    }
}

function ScanningInterface({ scanner }: { scanner: ScannerHook }) {
    return (
        <div className="px-4">
            <ARView scanner={scanner} />
            <AnalysisPanelContainer scanner={scanner} />
        </div>
    );
}

function AnalysisPanelContainer({ scanner }: { scanner: ScannerHook }) {
    const show = scanner.detectedArea !== null && scanner.isLocked;
    if (!show) return null;
    return <AnalysisPanel scanner={scanner} />;
}
