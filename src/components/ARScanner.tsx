import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function ARScanner() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [isScanning, setIsScanning] = useState(false);
    const [detectedArea, setDetectedArea] = useState<number | null>(null);

    // For now, simulate AR detection since 8th Wall requires API key
    const handleStartScan = () => {
        setIsScanning(true);
        // Simulate detection after 2 seconds
        setTimeout(() => {
            setDetectedArea(100); // Simulated 100m²
        }, 2000);
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-700">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center">
                            <span className="text-sm">🌧️</span>
                        </div>
                        <span className="font-semibold text-sm">Micro-Catchment</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{user?.email}</span>
                        <button
                            onClick={handleLogout}
                            className="text-xs text-gray-400 hover:text-white transition"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-16 pb-24">
                {!isScanning ? (
                    /* Pre-scan View */
                    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 
                          border-2 border-red-500/50 flex items-center justify-center mb-6 animate-pulse">
                            <svg className="w-16 h-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Ready to Scan</h2>
                        <p className="text-gray-400 mb-8 max-w-xs">
                            Point your camera at a street, parking lot, or sidewalk to detect impervious surfaces
                        </p>
                        <button
                            onClick={handleStartScan}
                            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 
                        font-semibold shadow-lg hover:shadow-xl transition-all
                        hover:scale-105 active:scale-95"
                        >
                            📷 Start AR Scan
                        </button>

                        {/* Test Images Fallback */}
                        <div className="mt-8 text-center">
                            <p className="text-xs text-gray-500 mb-3">Or use test images:</p>
                            <div className="flex gap-2 justify-center">
                                {['parking_lot', 'sidewalk', 'road'].map((img) => (
                                    <button
                                        key={img}
                                        onClick={() => {
                                            setIsScanning(true);
                                            setDetectedArea(100);
                                        }}
                                        className="px-3 py-1 rounded-lg bg-gray-800 text-xs text-gray-400 
                              hover:bg-gray-700 transition"
                                    >
                                        {img}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Scanning/Detected View */
                    <div className="px-4">
                        {/* Simulated Camera View */}
                        <div className="relative rounded-2xl overflow-hidden bg-gray-800 aspect-video mb-6">
                            <div className="absolute inset-0 flex items-center justify-center">
                                {detectedArea === null ? (
                                    <div className="text-center">
                                        <div className="w-16 h-16 border-4 border-red-500 border-t-transparent 
                                  rounded-full animate-spin mb-4 mx-auto" />
                                        <p className="text-red-400">Scanning for surfaces...</p>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0">
                                        {/* Red overlay for impervious area */}
                                        <div className="absolute inset-4 rounded-xl bg-red-500/30 border-2 border-red-500 
                                  flex items-center justify-center">
                                            <div className="bg-black/70 rounded-lg px-4 py-2">
                                                <p className="text-red-400 font-mono text-lg">{detectedArea}m² impervious</p>
                                                <p className="text-xs text-gray-400">Runoff coefficient: 0.9</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {detectedArea !== null && (
                            <>
                                {/* Detected Info */}
                                <div className="bg-gray-800 rounded-2xl p-4 mb-6">
                                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-red-500" />
                                        Detected Impervious Surface
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-400">Area</p>
                                            <p className="font-mono text-lg">{detectedArea}m²</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Peak Runoff</p>
                                            <p className="font-mono text-lg">1.25 L/s</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Suggested Fixes */}
                                <div className="bg-gray-800 rounded-2xl p-4 mb-6">
                                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-emerald-500" />
                                        Suggested Green Fixes
                                    </h3>
                                    <div className="space-y-3">
                                        {[
                                            { type: 'Rain Garden', size: '20m²', placement: 'Sidewalk edge', reduction: '40%', color: 'blue' },
                                            { type: 'Permeable Pave', size: '50m²', placement: 'Parking area', reduction: '70%', color: 'emerald' },
                                            { type: 'Tree Planters', size: '10m² ×3', placement: 'Road verge', reduction: '25%', color: 'green' },
                                        ].map((fix, i) => (
                                            <div key={i} className="flex items-center justify-between bg-gray-700/50 rounded-xl p-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-lg bg-${fix.color}-500/20 
                                        flex items-center justify-center`}>
                                                        <span className="text-lg">
                                                            {fix.type === 'Rain Garden' ? '🌿' : fix.type === 'Permeable Pave' ? '🧱' : '🌳'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{fix.type}</p>
                                                        <p className="text-xs text-gray-400">{fix.placement}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-mono text-sm">{fix.size}</p>
                                                    <p className="text-xs text-emerald-400">-{fix.reduction}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
                                        <span className="text-gray-400">Total Reduction</span>
                                        <span className="text-xl font-bold text-emerald-400">&gt;30%</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => navigate('/save')}
                                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 
                              font-semibold shadow-lg transition-all hover:shadow-xl"
                                    >
                                        💾 Save Project
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsScanning(false);
                                            setDetectedArea(null);
                                        }}
                                        className="px-4 py-3 rounded-xl bg-gray-700 font-semibold transition-all hover:bg-gray-600"
                                    >
                                        🔄
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
