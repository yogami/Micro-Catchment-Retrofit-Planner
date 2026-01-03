import { useARScanner } from '../hooks/useARScanner';
import { DemoOverlay } from './DemoOverlay';
import { useDemoState } from '../hooks/useDemoState';
import { ScannerHeader } from './scanner/ScannerHeader';
import { OnboardingView } from './scanner/OnboardingView';
import { ARView } from './scanner/ARView';
import { AnalysisPanel } from './scanner/AnalysisPanel';

type ScannerHook = ReturnType<typeof useARScanner>;

export function ARScanner() {
    const scanner = useARScanner();
    const { showDemo, completeDemo, skipDemo } = useDemoState();

    return (
        <div className="min-h-screen bg-gray-900 text-white" data-jurisdiction-code={scanner.activeProfile.jurisdictionCode}>
            {showDemo && <DemoOverlay onComplete={completeDemo} onSkip={skipDemo} />}
            <ScannerHeader scanner={scanner} />
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
    if (!scanner.isScanning) return <OnboardingView scanner={scanner} />;
    return <ScanningInterface scanner={scanner} />;
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
