import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ModelPlacement } from './ModelPlacement';
import { DemoOverlay, useDemoState } from './DemoOverlay';
import { openMeteoClient } from '../services/openMeteoClient';
import { suggestGreenFixes, calculateTotalReduction, computePeakRunoff, RUNOFF_COEFFICIENTS, computeRunoffWithPINN } from '../utils/hydrology';
import type { GreenFix } from '../utils/hydrology';

// Import model-viewer
import '@google/model-viewer';

export function ARScanner() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const locationState = useLocation();

    // Import location state for demo
    const demoScenario = locationState.state?.demoScenario;

    const [isScanning, setIsScanning] = useState(false);
    const [detectedArea, setDetectedArea] = useState<number | null>(null);
    const [rainfall, setRainfall] = useState<number>(50); // Default 50mm/hr
    const [isLoadingRainfall, setIsLoadingRainfall] = useState(true);
    const [fixes, setFixes] = useState<GreenFix[]>([]);
    const [showAR, setShowAR] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [locationName, setLocationName] = useState<string>('Berlin');
    const { showDemo, completeDemo, skipDemo } = useDemoState();

    // Handle Demo Auto-Start
    useEffect(() => {
        if (demoScenario && !isScanning) {
            async function startDemo() {
                setIsLoadingRainfall(true);
                if (demoScenario === 'fairfax') {
                    const lat = 38.8462, lon = -77.3064; // Fairfax, VA
                    const storm = await openMeteoClient.getDesignStorm(lat, lon);
                    setRainfall(storm);
                    setLocation({ lat, lon });
                    setLocationName('Fairfax, VA');
                    setDetectedArea(120);
                } else if (demoScenario === 'berlin') {
                    const lat = 52.52, lon = 13.405; // Berlin
                    const storm = await openMeteoClient.getDesignStorm(lat, lon);
                    setRainfall(storm);
                    setLocation({ lat, lon });
                    setLocationName('Berlin');
                    setDetectedArea(80);
                }
                setIsLoadingRainfall(false);
                setIsScanning(true);
            }
            startDemo();
        }
    }, [demoScenario]);

    // Detect location and fetch rainfall
    useEffect(() => {
        if (demoScenario) return; // Skip if demo is active

        async function init() {
            setIsLoadingRainfall(true);
            let lat = 52.52; // Default Berlin
            let lon = 13.405;

            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        lat = pos.coords.latitude;
                        lon = pos.coords.longitude;
                        setLocation({ lat, lon });
                        setLocationName('Current Location');
                        const storm = await openMeteoClient.getDesignStorm(lat, lon);
                        setRainfall(storm);
                        setIsLoadingRainfall(false);
                    },
                    async () => {
                        // Fallback to Berlin
                        const storm = await openMeteoClient.getDesignStorm(lat, lon);
                        setRainfall(storm);
                        setIsLoadingRainfall(false);
                    }
                );
            } else {
                const storm = await openMeteoClient.getDesignStorm(lat, lon);
                setRainfall(storm);
                setIsLoadingRainfall(false);
            }
        }
        init();
    }, []);

    // Calculate fixes when area is detected
    useEffect(() => {
        if (detectedArea) {
            const suggestedFixes = suggestGreenFixes(detectedArea, rainfall);
            setFixes(suggestedFixes);
        }
    }, [detectedArea, rainfall]);

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

    const totalReduction = fixes.length > 0
        ? calculateTotalReduction(fixes.map(f => ({ size: f.size, reductionRate: f.reductionRate })), detectedArea || 100)
        : 0;

    const [peakRunoff, setPeakRunoff] = useState(0);
    const [isPinnActive, setIsPinnActive] = useState(false);

    // Calculate runoff using PINN (or fallback)
    useEffect(() => {
        let mounted = true;
        async function calcRunoff() {
            if (detectedArea) {
                // Try PINN first
                try {
                    const q = await computeRunoffWithPINN(rainfall, detectedArea);
                    if (mounted) {
                        setPeakRunoff(q);
                        setIsPinnActive(true);
                    }
                } catch (e) {
                    // Start Synchronous Fallback
                    const q = computePeakRunoff(rainfall, detectedArea, RUNOFF_COEFFICIENTS.impervious);
                    if (mounted) {
                        setPeakRunoff(q);
                        setIsPinnActive(false);
                    }
                }
            } else {
                setPeakRunoff(0);
                setIsPinnActive(false);
            }
        }
        calcRunoff();
        return () => { mounted = false; };
    }, [detectedArea, rainfall]);

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Demo Overlay for first-time users */}
            {showDemo && (
                <DemoOverlay onComplete={completeDemo} onSkip={skipDemo} />
            )}

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
                        {/* Rainfall Info */}
                        <div className="mb-6 bg-blue-500/20 rounded-xl px-4 py-2 text-blue-300 text-sm">
                            {isLoadingRainfall ? (
                                <span>Detecting location & rainfall...</span>
                            ) : (
                                <span>🌧️ {locationName} design storm: {rainfall}mm/hr</span>
                            )}
                        </div>

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
                            Point your camera at a street, parking lot, or sidewalk to visualize green infrastructure
                        </p>
                        <button
                            onClick={handleStartScan}
                            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 
                        font-semibold shadow-lg hover:shadow-xl transition-all
                        hover:scale-105 active:scale-95"
                        >
                            📷 Start AR Scan
                        </button>

                        {/* Test Scenarios Fallback */}
                        <div className="mt-8 text-center max-w-sm">
                            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Simulated Test Scenarios (Fast Verification)</p>
                            <div className="flex gap-2 justify-center flex-wrap">
                                <button
                                    onClick={async () => {
                                        setIsLoadingRainfall(true);
                                        const lat = 38.8462, lon = -77.3064; // Fairfax, VA
                                        const storm = await openMeteoClient.getDesignStorm(lat, lon);
                                        setRainfall(storm);
                                        setLocation({ lat, lon });
                                        setLocationName('Fairfax, VA');
                                        setIsLoadingRainfall(false);
                                        setIsScanning(true);
                                        setDetectedArea(120);
                                    }}
                                    className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-400 font-bold hover:bg-emerald-500/30 transition"
                                >
                                    🗽 Scenario: Fairfax (120m²)
                                </button>
                                <button
                                    onClick={async () => {
                                        setIsLoadingRainfall(true);
                                        const lat = 52.52, lon = 13.405; // Berlin
                                        const storm = await openMeteoClient.getDesignStorm(lat, lon);
                                        setRainfall(storm);
                                        setLocation({ lat, lon });
                                        setLocationName('Berlin');
                                        setIsLoadingRainfall(false);
                                        setIsScanning(true);
                                        setDetectedArea(80);
                                    }}
                                    className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-xs text-blue-400 font-bold hover:bg-blue-500/30 transition"
                                >
                                    🥨 Scenario: Berlin (80m²)
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Scanning/Detected View */
                    <div className="px-4">
                        {/* Simulated Camera View / Detection */}
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
                                            <div className="bg-black/70 rounded-lg px-4 py-2 text-center">
                                                <p className="text-red-400 font-mono text-lg">{detectedArea}m² impervious</p>
                                                <p className="text-xs text-gray-400">Peak runoff: {peakRunoff.toFixed(2)} L/s</p>
                                                {isPinnActive && (
                                                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-[10px] text-purple-300 font-mono">
                                                        ⚡ AI-Physics Optimized
                                                    </span>
                                                )}
                                                {location && (
                                                    <p className="text-[10px] text-gray-500 mt-1 font-mono">
                                                        GPS: {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {detectedArea !== null && (
                            <>
                                {/* Rainfall + Reduction Stats */}
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="bg-blue-900/30 rounded-xl p-4 border border-blue-500/30">
                                        <p className="text-blue-400 text-sm">Rainfall</p>
                                        <p className="text-2xl font-bold">{rainfall}mm/hr</p>
                                    </div>
                                    <div className="bg-emerald-900/30 rounded-xl p-4 border border-emerald-500/30">
                                        <p className="text-emerald-400 text-sm">Total Reduction</p>
                                        <p className="text-2xl font-bold text-emerald-400">{Math.round(totalReduction)}%</p>
                                    </div>
                                </div>

                                {/* Toggle AR View */}
                                <div className="flex gap-2 mb-4">
                                    <button
                                        onClick={() => setShowAR(false)}
                                        className={`flex-1 py-2 rounded-lg font-semibold transition ${!showAR ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400'
                                            }`}
                                    >
                                        📋 List View
                                    </button>
                                    <button
                                        onClick={() => setShowAR(true)}
                                        className={`flex-1 py-2 rounded-lg font-semibold transition ${showAR ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400'
                                            }`}
                                    >
                                        📱 3D/AR View
                                    </button>
                                </div>

                                {showAR ? (
                                    /* 3D Model View */
                                    <ModelPlacement fixes={fixes} />
                                ) : (
                                    /* List View */
                                    <div className="bg-gray-800 rounded-2xl p-4 mb-6">
                                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-emerald-500" />
                                            Suggested Green Fixes
                                        </h3>
                                        <div className="space-y-3">
                                            {fixes.map((fix, i) => (
                                                <div key={i} className="flex items-center justify-between bg-gray-700/50 rounded-xl p-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                                            <span className="text-lg">
                                                                {fix.type === 'rain_garden' ? '🌿' : fix.type === 'permeable_pavement' ? '🧱' : '🌳'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm capitalize">{fix.type.replace('_', ' ')}</p>
                                                            <p className="text-xs text-gray-400">{fix.placement}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-mono text-sm">{fix.size}m²</p>
                                                        <p className="text-xs text-emerald-400">-{Math.round(fix.reductionRate * 100)}%</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => navigate('/save', {
                                            state: {
                                                fixes,
                                                detectedArea,
                                                rainfall,
                                                isPinnActive,
                                                peakRunoff,
                                                locationName
                                            }
                                        })}
                                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 
                              font-semibold shadow-lg transition-all hover:shadow-xl"
                                    >
                                        💾 Save Project
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsScanning(false);
                                            setDetectedArea(null);
                                            setFixes([]);
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
