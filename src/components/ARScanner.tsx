import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ModelPlacement } from './ModelPlacement';
import { DemoOverlay, useDemoState } from './DemoOverlay';
import { ValidationChart } from './ValidationChart';
import { openMeteoClient } from '../services/openMeteoClient';
import { suggestGreenFixes, calculateTotalReduction, computePeakRunoff, RUNOFF_COEFFICIENTS, computeRunoffWithPINN } from '../utils/hydrology';
import type { GreenFix } from '../utils/hydrology';
import { useUnitStore } from '../store/useUnitStore';
import { convertArea, convertRainfall, convertFlow, getAreaUnit, getRainUnit, getFlowUnit } from '../utils/units';

// Import model-viewer
import '@google/model-viewer';

export function ARScanner() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const locationState = useLocation();
    const { unitSystem, toggleUnitSystem } = useUnitStore();

    // Import location state for demo
    const demoScenario = locationState.state?.demoScenario;

    const [isScanning, setIsScanning] = useState(false);
    const [detectedArea, setDetectedArea] = useState<number | null>(null);
    const [rainfall, setRainfall] = useState<number>(50); // Default 50mm/hr
    const [isLoadingRainfall, setIsLoadingRainfall] = useState(true);
    const [fixes, setFixes] = useState<GreenFix[]>([]);
    const [showAR, setShowAR] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [locationName, setLocationName] = useState<string>('Current Project');
    const { showDemo, completeDemo, skipDemo } = useDemoState();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [isLocked, setIsLocked] = useState(false);

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
                setIsLocked(true);
            }
            startDemo();
        }
    }, [demoScenario, isScanning]);

    // Detect location and fetch rainfall
    useEffect(() => {
        if (demoScenario) return;

        async function init() {
            setIsLoadingRainfall(true);
            let lat = 52.52;
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
    }, [demoScenario]);

    // Calculate fixes when area is detected
    useEffect(() => {
        if (detectedArea) {
            const suggestedFixes = suggestGreenFixes(detectedArea, rainfall);
            setFixes(suggestedFixes);
        }
    }, [detectedArea, rainfall]);

    const handleStartScan = () => {
        setIsScanning(true);
        setDetectedArea(null);
        setScanProgress(0);
        setIsLocked(false);
    };

    // Simulated Area Accumulation (Dynamic Scan)
    useEffect(() => {
        let interval: any;
        if (isDetecting && isScanning && !isLocked) {
            interval = setInterval(() => {
                setDetectedArea(prev => {
                    const next = (prev || 0) + (Math.random() * 5 + 2);
                    return Math.min(next, 500);
                });
                setScanProgress(prev => Math.min(prev + 2, 100));
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isDetecting, isScanning, isLocked]);

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
                try {
                    const q = await computeRunoffWithPINN(rainfall, detectedArea);
                    if (mounted) {
                        setPeakRunoff(q);
                        setIsPinnActive(true);
                    }
                } catch (e) {
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

    // Handle real camera feed
    useEffect(() => {
        let stream: MediaStream | null = null;
        async function startCamera() {
            if (isScanning && videoRef.current) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: 'environment',
                            width: { ideal: 1920 },
                            height: { ideal: 1080 }
                        }
                    });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (err) {
                    console.error("Camera access failed:", err);
                    setCameraError("Camera access denied or unavailable.");
                }
            }
        }
        startCamera();
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isScanning]);

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {showDemo && <DemoOverlay onComplete={completeDemo} onSkip={skipDemo} />}

            <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-700">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center">
                            <span className="text-sm">🌧️</span>
                        </div>
                        <span className="font-semibold text-sm">Micro-Catchment</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleUnitSystem}
                            className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-gray-700 transition-colors"
                        >
                            {unitSystem === 'metric' ? 'UNIT: METRIC' : 'UNIT: US/IMP'}
                        </button>
                        <span className="text-xs text-gray-400">{user?.email}</span>
                        <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-white transition">Logout</button>
                    </div>
                </div>
            </header>

            <main className="pt-16 pb-24">
                {!isScanning ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
                        <div className="mb-6 bg-blue-500/20 rounded-xl px-4 py-2 text-blue-300 text-sm">
                            {isLoadingRainfall ? <span>Detecting location & rainfall...</span> : <span>🌧️ {locationName} design storm: {convertRainfall(rainfall, unitSystem).toFixed(2)}{getRainUnit(unitSystem)}</span>}
                        </div>
                        <div className="w-32 h-32 rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-500/50 flex items-center justify-center mb-6 animate-pulse">
                            <svg className="w-16 h-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-white">Ready to Scan</h2>
                        <p className="text-gray-400 mb-8 max-w-xs text-sm">Point your camera at a street or sidewalk to measure runoff and plan retrofits.</p>
                        <button onClick={handleStartScan} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 font-semibold shadow-lg hover:scale-105 active:scale-95 transition-all text-white">📷 Start AR Scan</button>
                    </div>
                ) : (
                    <div className="px-4">
                        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] mb-6 shadow-2xl ring-1 ring-white/10">
                            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                            {cameraError && (
                                <div className="absolute inset-0 flex items-center justify-center p-6 text-center bg-black/60">
                                    <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-6">
                                        <p className="text-red-400 font-bold mb-2">⚠️ Camera Error</p>
                                        <p className="text-sm text-gray-300">{cameraError}</p>
                                        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold">Retry</button>
                                    </div>
                                </div>
                            )}
                            {!cameraError && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                                    {/* Targeting Reticle */}
                                    <div className={`w-32 h-32 border-2 border-dashed rounded-3xl transition-all duration-500 flex items-center justify-center
                                        ${isDetecting ? 'border-emerald-400 scale-110 shadow-[0_0_20px_rgba(52,211,153,0.3)]' : 'border-white/30 scale-100'}
                                        ${isLocked ? 'opacity-0 scale-150' : 'opacity-100'}`}>
                                        <div className={`w-2 h-2 rounded-full bg-white ${isDetecting ? 'animate-ping' : ''}`} />
                                    </div>

                                    {/* Status Indicator */}
                                    {!isLocked && (
                                        <div className="mt-8 flex flex-col items-center gap-4">
                                            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${isDetecting ? 'bg-emerald-400 animate-pulse' : 'bg-white'}`} />
                                                    <p className="text-[10px] font-black tracking-widest text-white uppercase">
                                                        {isDetecting ? 'Analyzing Surface...' : 'Identify Impervious Area'}
                                                    </p>
                                                </div>
                                                <p className="text-[8px] text-gray-400 uppercase font-bold tracking-tight">
                                                    {isDetecting ? 'Calculating Runoff Potential (C=0.9)' : 'Estimated for asphalt/concrete'}
                                                </p>
                                            </div>

                                            {detectedArea && (
                                                <div className="bg-emerald-500/90 text-white font-mono font-black px-4 py-1 rounded-lg text-lg animate-in zoom-in-50 shadow-lg border border-emerald-400/50">
                                                    {Math.round(convertArea(detectedArea, unitSystem))} {getAreaUnit(unitSystem)}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Scanning Controls */}
                                    {!isLocked && (
                                        <div className="absolute bottom-8 left-0 right-0 px-8 flex flex-col gap-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onMouseDown={() => setIsDetecting(true)}
                                                    onMouseUp={() => setIsDetecting(false)}
                                                    onTouchStart={() => setIsDetecting(true)}
                                                    onTouchEnd={() => setIsDetecting(false)}
                                                    className={`flex-[2] py-5 rounded-2xl font-black transition-all shadow-2xl active:scale-95 text-xs uppercase tracking-widest
                                                        ${isDetecting ? 'bg-emerald-500 text-white' : 'bg-white text-gray-900 font-bold'}`}
                                                >
                                                    {isDetecting ? '⏺ Sampling Asphalt...' : '⏺ Mark Catchment'}
                                                </button>

                                                {detectedArea && (
                                                    <button
                                                        onClick={() => setIsLocked(true)}
                                                        className="flex-1 py-5 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest shadow-2xl border border-emerald-400/50"
                                                    >
                                                        Done
                                                    </button>
                                                )}
                                            </div>

                                            {!detectedArea && (
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight opacity-60">
                                                    Hold to map surface as high-runoff catchment
                                                </p>
                                            )}

                                            {isDetecting && (
                                                <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-emerald-400 transition-all duration-100"
                                                        style={{ width: `${scanProgress}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Final Result Card (Locked Mode) */}
                                    {isLocked && (
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(16,185,129,0.1)_100%)]">
                                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] animate-in slide-in-from-bottom-10">
                                                <div className="bg-gray-900/95 backdrop-blur-2xl border border-emerald-500/50 rounded-2xl p-5 shadow-2xl text-left">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <div>
                                                            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">Total Catchment Area</p>
                                                            <div className="flex items-baseline gap-1">
                                                                <p className="text-3xl font-mono font-black text-white">{Math.round(convertArea(detectedArea || 0, unitSystem))}</p>
                                                                <p className="text-xs font-bold text-gray-500 uppercase">{getAreaUnit(unitSystem)}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Peak Site Runoff</p>
                                                            <p className="text-2xl font-mono text-cyan-400 font-black">{convertFlow(peakRunoff, unitSystem).toFixed(2)}{getFlowUnit(unitSystem)}</p>
                                                        </div>
                                                    </div>

                                                    <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                                                        <button
                                                            onClick={() => setIsLocked(false)}
                                                            className="flex items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                                                        >
                                                            ➕ Resume Mapping
                                                        </button>
                                                        {isPinnActive && (
                                                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-[9px] text-purple-300 border border-purple-500/30 font-black tracking-tighter uppercase">
                                                                ⚡ AI-PINN Powered
                                                            </span>
                                                        )}
                                                    </div>
                                                    {location && (
                                                        <p className="text-[9px] text-gray-500 mt-2 font-mono text-center opacity-40 uppercase tracking-widest">
                                                            GEO: {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {detectedArea !== null && isLocked && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="bg-blue-900/40 rounded-2xl p-4 border border-blue-500/30">
                                        <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-1 opacity-80">Storm Intensity</p>
                                        <p className="text-2xl font-bold text-white">{convertRainfall(rainfall, unitSystem).toFixed(2)}<span className="text-sm ml-1 font-normal text-blue-300/60">{getRainUnit(unitSystem)}</span></p>
                                    </div>
                                    <div className="bg-emerald-900/40 rounded-2xl p-4 border border-emerald-500/30">
                                        <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-1 opacity-80">Peak Reduction</p>
                                        <p className="text-2xl font-bold text-emerald-400">{Math.round(totalReduction)}%</p>
                                    </div>
                                </div>

                                <div className="flex gap-2 mb-4 bg-gray-800 p-1 rounded-xl">
                                    <button onClick={() => setShowAR(false)} className={`flex-1 py-2.5 rounded-lg font-bold text-xs transition-all ${!showAR ? 'bg-gray-700 text-white' : 'text-gray-400'}`}>📋 SUGGESTIONS</button>
                                    <button onClick={() => setShowAR(true)} className={`flex-1 py-2.5 rounded-lg font-bold text-xs transition-all ${showAR ? 'bg-gray-700 text-white' : 'text-gray-400'}`}>📱 3D PREVIEW</button>
                                </div>

                                {showAR ? <ModelPlacement fixes={fixes} /> : (
                                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-5 mb-6 border border-white/5">
                                        <h3 className="font-bold mb-4 flex items-center gap-2 text-xs text-gray-400 uppercase tracking-widest">Hydrology Mitigation Strategy</h3>
                                        <div className="space-y-3">
                                            {fixes.map((fix, i) => (
                                                <div key={i} className="flex items-center justify-between bg-gray-900/40 rounded-2xl p-4 border border-white/5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-2xl">
                                                            {fix.type === 'rain_garden' ? '🌿' : fix.type === 'permeable_pavement' ? '🧱' : '🌳'}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm capitalize text-white">{fix.type.replace('_', ' ')}</p>
                                                            <p className="text-[10px] text-gray-500 font-medium">{fix.placement}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-mono text-sm font-bold text-white">{Math.round(convertArea(fix.size, unitSystem))}{getAreaUnit(unitSystem)}</p>
                                                        <p className="text-[10px] text-emerald-400 font-bold">-{Math.round(fix.reductionRate * 100)}% RELIEF</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {demoScenario === 'fairfax' && <div className="mb-6"><ValidationChart appPrediction={peakRunoff} /></div>}

                                <div className="flex gap-3 mb-8">
                                    <button onClick={() => navigate('/save', { state: { fixes, detectedArea, rainfall, isPinnActive, peakRunoff, locationName } })} className="flex-1 py-5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-500 font-black text-white shadow-xl uppercase tracking-widest text-sm">💾 Save Project Portfolio</button>
                                    <button onClick={() => { setIsScanning(false); setDetectedArea(null); setFixes([]); setIsLocked(false); }} className="px-6 py-5 rounded-2xl bg-gray-800 text-gray-300 font-bold border border-white/10 uppercase tracking-widest text-sm">🔄 Reset</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
