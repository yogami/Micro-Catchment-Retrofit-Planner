import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { suggestGreenFixes, calculateTotalReduction } from '../utils/hydrology';

interface ScannerState {
    fixes?: Array<{ size: number; reductionRate: number; type: 'rain_garden' | 'permeable_pavement' | 'tree_planter'; placement: string }>;
    detectedArea?: number;
    rainfall?: number;
    isPinnActive?: boolean;
    peakRunoff?: number;
}

export function SaveProject() {
    const navigate = useNavigate();
    const location = useLocation();
    const state = (location.state || {}) as ScannerState;
    const { streetName, setStreetName, isLoading, error, handleSubmit } = useSaveAction(state);

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <SaveHeader onBack={() => navigate('/scanner')} />
            <main className="pt-20 pb-8 px-4">
                <PreviewCard state={state} />
                <SaveForm
                    streetName={streetName}
                    setStreetName={setStreetName}
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    error={error}
                />
                <NextSteps />
            </main>
        </div>
    );
}

function useSaveAction(state: ScannerState) {
    const [streetName, setStreetName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const fixes = state.fixes || suggestGreenFixes(100);
    const totalArea = state.detectedArea || 100;
    const totalReduction = calculateTotalReduction(fixes, totalArea);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        const { data, error: err } = await projectService.create({
            street_name: streetName, screenshot: null, features: fixes,
            total_area: totalArea, total_reduction: totalReduction,
        });
        if (err) { setError(err.message); setIsLoading(false); }
        else if (data) navigate(`/project/${data.id}`);
    };

    return { streetName, setStreetName, isLoading, error, handleSubmit };
}

function SaveHeader({ onBack }: { onBack: () => void }) {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-700 flex items-center justify-between px-4 py-3">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition">← Back</button>
            <h1 className="font-semibold">Save Project</h1>
            <div className="w-12" />
        </header>
    );
}

function PreviewCard({ state }: { state: ScannerState }) {
    const area = state.detectedArea || 100;
    const fixes = state.fixes || suggestGreenFixes(area);
    const reduction = calculateTotalReduction(fixes, area);
    return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden mb-6">
            <PreviewVisual state={state} area={area} />
            <PreviewStats fixes={fixes.length} reduction={reduction} />
        </div>
    );
}

function PreviewVisual({ state, area }: { state: ScannerState; area: number }) {
    return (
        <div className="aspect-video bg-gray-800 relative flex items-center justify-center">
            <VisualContent area={area} peak={state.peakRunoff} isPinn={state.isPinnActive} />
            <RainfallBadge rainfall={state.rainfall} />
        </div>
    );
}

function VisualContent({ area, peak, isPinn }: { area: number; peak?: number; isPinn?: boolean }) {
    return (
        <div className="text-center p-4">
            <p className="text-red-400 font-mono text-lg">{area}m² detected</p>
            <p className="text-xs text-gray-400 font-mono mt-1">Peak: {(peak || 0).toFixed(2)} L/s</p>
            {isPinn && <span className="mt-2 px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono">⚡ AI-Physics Optimized</span>}
        </div>
    );
}

function RainfallBadge({ rainfall }: { rainfall?: number }) {
    return (
        <div className="absolute top-2 right-2 bg-blue-500/80 rounded-lg px-2 py-1 text-[10px] text-white">
            🌧️ {rainfall || 50}mm/hr
        </div>
    );
}

function PreviewStats({ fixes, reduction }: { fixes: number; reduction: number }) {
    return (
        <div className="p-4 flex justify-between">
            <div><p className="text-gray-400 text-sm">Green Fixes</p><p className="font-semibold">{fixes} recommended</p></div>
            <div className="text-right"><p className="text-gray-400 text-sm">Reduction</p><p className="font-semibold text-emerald-400">{Math.round(reduction)}%</p></div>
        </div>
    );
}

function SaveForm({ streetName, setStreetName, onSubmit, isLoading, error }: {
    streetName: string; setStreetName: (v: string) => void; onSubmit: (e: FormEvent) => void; isLoading: boolean; error: string | null
}) {
    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <NameInput value={streetName} onChange={setStreetName} />
            {error && <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm">{error}</div>}
            <SubmitButton isLoading={isLoading} disabled={!streetName.trim()} />
        </form>
    );
}

function NameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div>
            <label htmlFor="streetName" className="block text-sm font-medium text-gray-300 mb-2">Project Name</label>
            <input id="streetName" type="text" value={value} onChange={(e) => onChange(e.target.value)}
                placeholder="e.g., Kreuzberg Flood Fix" required
                className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700" />
        </div>
    );
}

function SubmitButton({ isLoading, disabled }: { isLoading: boolean; disabled: boolean }) {
    return (
        <button type="submit" disabled={isLoading || disabled} className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold disabled:opacity-50">
            {isLoading ? 'Saving...' : '💾 Save & Get Share Link'}
        </button>
    );
}

function NextSteps() {
    return (
        <div className="mt-8 bg-gray-800/50 rounded-xl p-4">
            <h3 className="font-semibold mb-2">📤 What happens next?</h3>
            <ul className="text-sm text-gray-400 space-y-2">
                <li>✓ Project saved to your account</li>
                <li>✓ Shareable URL generated</li>
                <li>✓ Export as PDF for grant applications</li>
            </ul>
        </div>
    );
}
