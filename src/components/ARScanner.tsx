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
