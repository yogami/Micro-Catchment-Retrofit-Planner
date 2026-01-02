import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { suggestGreenFixes, calculateTotalReduction } from '../utils/hydrology';

export function SaveProject() {
    const [streetName, setStreetName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Get data from scanner state or fallback to defaults
    const scannerState = location.state || {};
    const fixes = scannerState.fixes || suggestGreenFixes(100, 50);
    const totalArea = scannerState.detectedArea || 100;
    const rainfall = scannerState.rainfall || 50;
    const isPinnActive = scannerState.isPinnActive || false;
    const peakRunoff = scannerState.peakRunoff || 0;

    const totalReduction = calculateTotalReduction(
        fixes.map((f: any) => ({ size: f.size, reductionRate: f.reductionRate })),
        totalArea
    );

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const { data, error } = await projectService.create({
            street_name: streetName,
            screenshot: null, // Will be captured from AR in future
            features: fixes,
            total_area: totalArea,
            total_reduction: totalReduction,
        });

        if (error) {
            setError(error.message);
            setIsLoading(false);
        } else if (data) {
            navigate(`/project/${data.id}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-700">
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={() => navigate('/scanner')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <h1 className="font-semibold">Save Project</h1>
                    <div className="w-12" />
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-20 pb-8 px-4">
                {/* Preview Card */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden mb-6">
                    {/* Simulated Screenshot */}
                    <div className="aspect-video bg-gray-800 relative">
                        <div className="absolute inset-4 rounded-xl bg-red-500/20 border border-red-500/50 
                          flex items-center justify-center text-center p-4">
                            <div>
                                <p className="text-red-400 font-mono text-lg">{totalArea}m² detected</p>
                                <p className="text-xs text-gray-400 font-mono mt-1">Peak: {peakRunoff.toFixed(2)} L/s</p>
                                {isPinnActive && (
                                    <span className="inline-block mt-2 px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-[10px] text-purple-300 font-mono">
                                        ⚡ AI-Physics Optimized
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="absolute top-2 right-2 bg-blue-500/80 rounded-lg px-2 py-1 text-[10px] text-white backdrop-blur">
                            🌧️ {rainfall}mm/hr
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-gray-400 text-sm">Green Fixes</p>
                                <p className="font-semibold">{fixes.length} recommended</p>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-400 text-sm">Reduction</p>
                                <p className="font-semibold text-emerald-400">{Math.round(totalReduction)}%</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="streetName" className="block text-sm font-medium text-gray-300 mb-2">
                            Project Name
                        </label>
                        <input
                            id="streetName"
                            type="text"
                            value={streetName}
                            onChange={(e) => setStreetName(e.target.value)}
                            placeholder="e.g., Kreuzberg Flood Fix"
                            required
                            className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white placeholder-gray-500 
                        border border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400
                        focus:border-transparent transition"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                            Give your project a descriptive name for the street or area
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || !streetName.trim()}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 
                      font-semibold shadow-lg hover:shadow-xl transition-all
                      disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Saving...
                            </span>
                        ) : (
                            '💾 Save & Get Share Link'
                        )}
                    </button>
                </form>

                {/* Info */}
                <div className="mt-8 bg-gray-800/50 rounded-xl p-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <span>📤</span> What happens next?
                    </h3>
                    <ul className="text-sm text-gray-400 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-400">✓</span>
                            Project saved to your account
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-400">✓</span>
                            Shareable URL generated
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-400">✓</span>
                            Export as PDF for grant applications
                        </li>
                    </ul>
                </div>
            </main>
        </div>
    );
}
