import { useARScanner, type UpdateFn } from '../../hooks/useARScanner';
import { ModelPlacement } from '../ModelPlacement';
import { ValidationChart } from '../ValidationChart';
import { SizingModeToggle } from './analysis/SizingModeToggle';
import { ParameterCards } from './analysis/ParameterCards';
import { SuggestionsList } from './analysis/SuggestionsList';
import { ComplianceDashboard } from './analysis/ComplianceDashboard';
import { ActionButtons } from './analysis/ActionButtons';

type ScannerHook = ReturnType<typeof useARScanner>;

export function AnalysisPanel({ scanner }: { scanner: ScannerHook }) {
    const isFairfax = (scanner.activeProfile.id === 'fairfax-county-stormwater');

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SizingModeToggle mode={scanner.sizingMode} setMode={(m) => scanner.update({ sizingMode: m })} />
            <ParameterCards scanner={scanner} />
            <ViewToggle showAR={scanner.showAR} update={scanner.update} />
            <PreviewPreview scanner={scanner} />
            {isFairfax && <ValidationChart appPrediction={scanner.peakRunoff} />}
            <ComplianceDashboard
                compliance={scanner.complianceResults}
                generating={scanner.isGeneratingPDF}
                onGenerate={scanner.handleGenerateGrant}
            />
            <ActionButtons
                onSave={() => handleSave(scanner)}
                onReset={() => scanner.update({ isScanning: false, detectedArea: null, fixes: [], isLocked: false })}
            />
        </div>
    );
}

function ViewToggle({ showAR, update }: { showAR: boolean; update: UpdateFn }) {
    const btnCls = (active: boolean) => `flex-1 py-2.5 rounded-lg font-bold text-xs ${active ? 'bg-gray-700 text-white' : 'text-gray-400'}`;
    return (
        <div className="flex gap-2 mb-4 bg-gray-800 p-1 rounded-xl">
            <button onClick={() => update({ showAR: false })} className={btnCls(!showAR)}>📋 SUGGESTIONS</button>
            <button onClick={() => update({ showAR: true })} className={btnCls(showAR)}>📱 3D PREVIEW</button>
        </div>
    );
}

function PreviewPreview({ scanner }: { scanner: ScannerHook }) {
    if (scanner.showAR) return <ModelPlacement fixes={scanner.fixes} />;
    return <SuggestionsList fixes={scanner.fixes} unitSystem={scanner.unitSystem} />;
}

function handleSave(scanner: ScannerHook) {
    scanner.navigate('/save', {
        state: {
            fixes: scanner.fixes,
            detectedArea: scanner.detectedArea,
            rainfall: scanner.rainfall,
            isPinnActive: scanner.isPinnActive,
            peakRunoff: scanner.peakRunoff,
            locationName: scanner.locationName
        }
    });
}
