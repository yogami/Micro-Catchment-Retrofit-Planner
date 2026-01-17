import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { GeoPolygon, type GeoVertex } from '../../../lib/spatial-coverage/domain/valueObjects/GeoPolygon';
import { useGPSAnchor } from '../../../hooks/scanner/useGPSAnchor';
import { ScannerHUD } from '../HUD/ScannerHUD';
import { CoordinateTransform } from '../../../lib/spatial-coverage/domain/services/CoordinateTransform';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

// Validation Constraints
const MIN_AREA = 2;
const MAX_AREA = 3500;
const MAX_RADIUS = 300;

export interface MapBoundaryViewProps {
    minVertices?: number;
    maxVertices?: number;
    onBoundaryConfirmed: (polygon: GeoPolygon) => void;
    onCancel?: () => void;
}

// Set token globally as early as possible
if (MAPBOX_TOKEN) {
    mapboxgl.accessToken = MAPBOX_TOKEN;
}

/**
 * MapBoundaryView - Main component for map-based boundary drawing.
 */
export function MapBoundaryView({
    minVertices = 3,
    maxVertices = 10,
    onBoundaryConfirmed,
    onCancel
}: MapBoundaryViewProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const hasInitRef = useRef(false);

    const [vertices, setVertices] = useState<GeoVertex[]>([]);
    const [isMapReady, setIsMapReady] = useState(false);
    const [mapInitError, setMapInitError] = useState(false);
    const [rawMapError, setRawMapError] = useState<string | null>(null);

    // DUAL-MODE GEOLOCATION:
    // Accuracy threshold relaxed to 100m for planning screen visibility.
    const gps = useGPSAnchor({ accuracyThreshold: 100 });

    const areaVal = useMemo(() => calculateArea(vertices), [vertices]);
    const isAreaTooSmall = vertices.length >= 3 && areaVal < MIN_AREA;
    const isAreaTooLarge = vertices.length >= 3 && areaVal > MAX_AREA;

    const isTooFar = useMemo(() => {
        if (vertices.length === 0 || !gps.lat || !gps.lon) return false;
        return vertices.some(v =>
            CoordinateTransform.haversineDistance({ lat: gps.lat!, lon: gps.lon! }, v) > MAX_RADIUS
        );
    }, [vertices, gps.lat, gps.lon]);

    const canConfirmCount = vertices.length >= minVertices;
    const isValid = canConfirmCount && !isAreaTooSmall && !isAreaTooLarge && !isTooFar;

    // STEP 1: INITIALIZE MAP ENGINE (ONE-TIME)
    useEffect(() => {
        if (!gps.lat || !gps.lon || !mapContainer.current || hasInitRef.current) return;

        if (!mapboxgl.supported()) {
            setMapInitError(true);
            setRawMapError("WebGL not supported.");
            return;
        }

        const watchdog = setTimeout(() => {
            if (!isMapReady && !mapInitError) {
                console.warn('Mapbox load watchdog triggered.');
                // We don't force READY here anymore; the UI now has a manual override
            }
        }, 12000);

        const timer = setTimeout(() => {
            if (!mapContainer.current || hasInitRef.current) return;
            hasInitRef.current = true; // Lock ONLY when we actually call the constructor

            try {
                console.log(`Starting Mapbox init at ${gps.lat}, ${gps.lon}`);
                const m = new mapboxgl.Map({
                    container: mapContainer.current,
                    style: 'mapbox://styles/mapbox/satellite-v9',
                    center: [gps.lon!, gps.lat!],
                    zoom: 19.5,
                    pitch: 0,
                    antialias: true,
                    trackResize: true,
                    attributionControl: false
                });

                const markReady = () => {
                    console.log('Map engine signaling READY');
                    setIsMapReady(true);
                };

                m.on('style.load', markReady);
                m.on('styledata', markReady);
                m.on('render', () => { if (!isMapReady) markReady(); });

                m.on('load', () => {
                    markReady();
                    m.resize();
                });

                m.on('error', (e) => {
                    console.error('Mapbox error event:', e);
                    const err = e.error || e;
                    let message = typeof err === 'string' ? err : err.message || JSON.stringify(err);

                    const status = (err as any)?.status;
                    if (status === 403 || message.includes('Forbidden') || message.includes('Unauthorized')) {
                        const tokenSnippet = MAPBOX_TOKEN ? `${MAPBOX_TOKEN.substring(0, 8)}...` : 'MISSING';
                        const currentHost = window.location.host;
                        message = `AUTH_FAILURE (403): Rejected Domain.\n[TOKEN]: ${tokenSnippet}\n[DOMAIN]: ${currentHost}`;
                    }

                    setRawMapError(message);
                    if (status === 401 || status === 403) {
                        setMapInitError(true);
                        clearTimeout(watchdog);
                    }
                });

                map.current = m;
            } catch (err) {
                setMapInitError(true);
                setRawMapError(err instanceof Error ? err.message : 'Constructor Failed');
            }
        }, 1000);

        return () => {
            clearTimeout(timer);
            clearTimeout(watchdog);
        };
    }, [gps.lat, gps.lon]);

    const handleRetry = useCallback(() => {
        setMapInitError(false);
        setRawMapError(null);
        setIsMapReady(false);
        hasInitRef.current = false;
        // The effect will re-run automatically due to hasInitRef being reset
    }, []);

    // Cleanup ONLY on unmount
    useEffect(() => {
        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
            hasInitRef.current = false;
        };
    }, []);

    // FOLLOW GPS ONLY IF NO NODES PLACED
    useEffect(() => {
        if (map.current && isMapReady && vertices.length === 0 && gps.lat && gps.lon) {
            map.current.easeTo({ center: [gps.lon, gps.lat], duration: 1000 });
        }
    }, [gps.lat, gps.lon, isMapReady, vertices.length]);

    // MANAGE MARKERS & POLYGONS
    useEffect(() => {
        if (!map.current || !isMapReady) return;

        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        vertices.forEach((v) => {
            const el = document.createElement('div');
            el.className = `w-3 h-3 rounded-full border border-white/80 shadow-2xl transition-all duration-300 flex items-center justify-center ${isTooFar ? 'bg-amber-500 scale-125' : 'bg-emerald-500'
                }`;
            const core = document.createElement('div');
            core.className = 'w-1 h-1 bg-white rounded-full';
            el.appendChild(core);

            const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
                .setLngLat([v.lon, v.lat])
                .addTo(map.current!);
            markersRef.current.push(marker);
        });

        updatePolygonLayer(map.current, vertices, isAreaTooSmall || isAreaTooLarge || isTooFar);
    }, [vertices, isTooFar, isAreaTooSmall, isAreaTooLarge, isMapReady]);

    const handleConfirm = useCallback(() => {
        if (!isValid) return;
        onBoundaryConfirmed(GeoPolygon.create(vertices));
    }, [vertices, isValid, onBoundaryConfirmed]);

    const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (vertices.length >= maxVertices) return;

        let newVertex: GeoVertex;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (map.current && isMapReady) {
            const lngLat = map.current.unproject([x, y]);
            newVertex = { lat: lngLat.lat, lon: lngLat.lng };
        } else {
            const dx = (x - rect.width / 2) * 0.1;
            const dy = (rect.height / 2 - y) * 0.1;
            newVertex = {
                lat: (gps.lat || 0) + (dy / 111320),
                lon: (gps.lon || 0) + (dx / (111320 * Math.cos((gps.lat || 0) * Math.PI / 180)))
            };
        }

        setVertices(prev => [...prev, newVertex]);
        if (navigator.vibrate) navigator.vibrate(20);
    }, [vertices.length, maxVertices, gps.lat, gps.lon, isMapReady]);

    if (!gps.lat || !gps.lon) {
        return <GPSWaitingView accuracy={gps.accuracy} error={gps.error} onSpoof={gps.spoof} />;
    }

    const showFallback = !MAPBOX_TOKEN || !isMapReady || mapInitError;

    return (
        <div className="relative w-full h-full bg-[#020617] overflow-hidden" data-testid="map-boundary-view">
            {/* 
                CRITICAL FIX: Isolated Map Container 
                React MUST NOT manage any children of the mapContainer.
            */}
            <div
                ref={mapContainer}
                className="absolute inset-0 z-10"
                data-testid="map-canvas-container"
            />

            {/* 
                Fallback Overlay (Sibling to Map)
                FIX: Removed solid background so we can see the map loading underneath 
            */}
            {showFallback && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                    <FallbackUI
                        isError={mapInitError}
                        isReady={isMapReady}
                        hasToken={!!MAPBOX_TOKEN}
                        errorMessage={rawMapError}
                        onOverride={() => setMapInitError(true)}
                        onRetry={handleRetry}
                    />
                </div>
            )}

            {/* Click Capture Overlay - Higher z-index than fallback to ensure interaction */}
            <div
                className="absolute inset-0 z-30 cursor-crosshair"
                onClick={handleContainerClick}
                data-testid="click-capture-overlay"
            />

            <ScannerHUD color={isTooFar || isAreaTooLarge ? 'amber' : 'emerald'} />

            {/* UI HUD Elements - Always on top */}
            <div className="absolute top-20 left-6 z-40 pointer-events-none">
                <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">PHASE 01</p>
                <h1 className="text-white text-2xl font-black uppercase tracking-tight">Site Planning</h1>
            </div>

            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-md pointer-events-none">
                <div className={`bg-black/80 backdrop-blur-xl px-6 py-4 rounded-3xl border shadow-2xl transition-all duration-500 ${isTooFar || isAreaTooLarge ? 'border-amber-500/50 -translate-y-1' : 'border-white/10'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isTooFar || isAreaTooLarge ? 'bg-amber-500' :
                            vertices.length >= minVertices ? 'bg-emerald-500' : 'bg-gray-400'
                            }`} />
                        <p className={`text-[11px] font-black uppercase tracking-widest ${isTooFar || isAreaTooLarge ? 'text-amber-400' : 'text-white'
                            }`}>
                            {isTooFar ? 'BOUNDS EXCEEDED: Stay near origin' :
                                isAreaTooLarge ? 'CATCHMENT TOO LARGE: Limit 3500m²' :
                                    isAreaTooSmall ? 'CATCHMENT TOO SMALL: Needs 2m²' :
                                        (gps.accuracy || 0) > 8 && vertices.length < minVertices ? 'LOW SIGNAL: Align nodes with physical curbs' :
                                            vertices.length < minVertices ? `SELECT ${minVertices - vertices.length} MORE NODES` :
                                                'GEOMETRY VALID: READY'}
                        </p>
                    </div>
                </div>
            </div>

            <MapControls
                canUndo={vertices.length > 0}
                canClear={vertices.length > 0}
                canConfirm={isValid}
                onUndo={() => setVertices(v => v.slice(0, -1))}
                onClear={() => setVertices([])}
                onConfirm={handleConfirm}
                onCancel={onCancel}
                statusMessage={isTooFar ? "Out of safe range" : isAreaTooLarge ? "Above max area" : isAreaTooSmall ? "Area too small" : ""}
            />

            <div className="absolute bottom-32 right-6 z-40 bg-black/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-[9px] font-mono pointer-events-none shadow-2xl min-w-[140px]">
                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-emerald-400 font-black">
                        <span>NODES</span>
                        <span data-testid="node-count">{vertices.length}</span>
                    </div>
                    <div className="h-px bg-white/10 my-0.5" />
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-500">AREA</span>
                        <span data-testid="area-value" className={`font-bold ${isAreaTooLarge || isAreaTooSmall ? 'text-amber-500' : 'text-white'}`}>
                            {areaVal.toFixed(1)}m²
                        </span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-500">RADIUS</span>
                        <span className={`font-bold ${isTooFar ? 'text-red-500' : 'text-white'}`}>
                            {vertices.length > 0 ? CoordinateTransform.haversineDistance({ lat: gps.lat!, lon: gps.lon! }, vertices[vertices.length - 1]).toFixed(1) : '0.0'}m
                        </span>
                    </div>
                    <div className="h-px bg-white/10 my-0.5" />
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-500 uppercase">Signal</span>
                        <span className={`font-black ${(gps.accuracy || 100) < 5 ? 'text-emerald-500' :
                            (gps.accuracy || 100) < 12 ? 'text-cyan-400' : 'text-amber-500'
                            }`}>
                            ±{(gps.accuracy || 0).toFixed(1)}m
                        </span>
                    </div>
                    <div className="h-px bg-white/10 my-0.5" />
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-500 uppercase text-[7px]">Map Engine</span>
                        <span className={`font-black ${mapInitError ? 'text-red-500' : isMapReady ? 'text-emerald-500' : 'text-amber-500'
                            }`}>
                            {mapInitError ? 'ERROR' : isMapReady ? 'READY' : 'LOADING'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FallbackUI({ isError, isReady, hasToken, errorMessage, onOverride, onRetry }: {
    isError: boolean;
    isReady: boolean;
    hasToken: boolean;
    errorMessage: string | null;
    onOverride: () => void;
    onRetry: () => void;
}) {
    const [showSlowLoadOverride, setShowSlowLoadOverride] = useState(false);

    useEffect(() => {
        if (!isReady && !isError) {
            const timer = setTimeout(() => setShowSlowLoadOverride(true), 5000);
            return () => clearTimeout(timer);
        }
    }, [isReady, isError]);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/*
                THE GRID: Now transparent so map shows through
                If token is missing, we keep it dark to signal 'Direct Mode'
            */}
            <div className={`absolute inset-0 grid grid-cols-12 grid-rows-12 gap-px transition-colors duration-1000 ${hasToken ? 'opacity-30 bg-black/20' : 'opacity-60 bg-slate-950'
                }`}>
                {Array.from({ length: 144 }).map((_, i) => <div key={i} className="border-[0.2px] border-emerald-500/20" />)}
            </div>

            <div className="absolute top-10 left-0 right-0 h-1 bg-gradient-to-b from-emerald-500/30 to-transparent animate-[scan_8s_linear_infinite]" />

            <div className="absolute inset-0 flex items-center justify-center">
                <div className="border border-emerald-500/20 bg-black/80 backdrop-blur-xl px-10 py-8 rounded-[2.5rem] text-center max-w-xs animate-in fade-in zoom-in duration-700 pointer-events-auto">
                    {!hasToken ? (
                        <>
                            <p className="text-red-500 text-3xl mb-4">🔑</p>
                            <p className="text-white text-xs font-black uppercase tracking-[0.2em] mb-1">Direct GPS Mode</p>
                            <p className="text-red-400/50 text-[9px] font-bold uppercase tracking-widest leading-relaxed mb-6">Mapbox Token Missing. <br /> Planning blind via coordinates.</p>
                            <button onClick={onOverride} className="text-[8px] text-emerald-400 font-black border border-emerald-500/30 px-4 py-2 rounded-full hover:bg-emerald-500/10 transition-colors pointer-events-auto">ACKNOWLEDGE</button>
                        </>
                    ) : isError ? (
                        <>
                            <p className="text-amber-500 text-3xl mb-4">⚠️</p>
                            <p className="text-white text-xs font-black uppercase tracking-[0.2em] mb-1">Satellite Link Interrupted</p>
                            <div className="bg-black/50 p-3 rounded-xl border border-white/5 mb-6 max-h-20 overflow-y-auto">
                                <p className="text-amber-500/80 text-[10px] font-mono leading-relaxed whitespace-pre-wrap">
                                    {errorMessage || 'Unknown engine failure.'}
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={onRetry} className="w-full py-3 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all">RETRY CONNECTION</button>
                                <button onClick={onOverride} className="w-full py-3 text-white/40 text-[8px] font-bold uppercase tracking-widest hover:text-white transition-colors">PLAN BLIND (GPS ONLY)</button>
                            </div>
                        </>
                    ) : isReady ? (
                        <>
                            <div className="w-10 h-10 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-white text-xs font-black uppercase tracking-[0.2em] mb-1">Finalizing Stream</p>
                            <p className="text-emerald-500/50 text-[9px] font-bold uppercase tracking-widest">Constructing Satellite Overlay...</p>
                        </>
                    ) : (
                        <>
                            <div className="w-10 h-10 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-white text-xs font-black uppercase tracking-[0.2em] mb-1">Engaging Satellites</p>
                            <p className="text-emerald-500/50 text-[9px] font-bold uppercase tracking-widest mb-6">Awaiting Tile Data Stream...</p>

                            {showSlowLoadOverride && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-700">
                                    <p className="text-[8px] text-white/30 uppercase font-bold mb-3 tracking-widest">Connection Sluggish?</p>
                                    <button
                                        onClick={onOverride}
                                        className="w-full py-3 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500/10 transition-all pointer-events-auto"
                                    >
                                        Plan Blind (GPS Only)
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function GPSWaitingView({ accuracy, error, onSpoof }: {
    accuracy: number | null;
    error: string | null;
    onSpoof: (lat: number, lon: number) => void;
}) {
    const [showSkip, setShowSkip] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setShowSkip(true), 4000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-full bg-[#020617] text-white p-8 text-center" data-testid="gps-waiting-view">
            <div className="relative w-24 h-24 mb-10">
                <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full" />
                <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center"><span className="text-3xl animate-pulse">🛰️</span></div>
            </div>
            <h2 className="text-2xl font-black mb-3 uppercase tracking-tight text-white">Signal Acquisition</h2>
            <p className="text-slate-500 text-xs mb-10 max-w-[260px] leading-relaxed">{error || 'Locking onto orbital satellites for precision...'}</p>
            {accuracy !== null && (
                <div className="bg-emerald-500/10 px-8 py-3 rounded-2xl mb-10 border border-emerald-500/20 animate-in zoom-in duration-500">
                    <p className="text-emerald-400 font-mono font-black text-sm tracking-[0.2em]">±{accuracy.toFixed(1)}M</p>
                </div>
            )}
            <div className="flex flex-col gap-4 w-full max-w-xs">
                {showSkip && (
                    <button
                        onClick={() => onSpoof(52.5208, 13.4094)}
                        className="w-full py-5 bg-white text-black rounded-3xl font-extrabold uppercase tracking-widest shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 transition-all animate-in slide-in-from-bottom-4 duration-700"
                    >
                        🚀 Quick Start (Berlin)
                    </button>
                )}
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[9px] text-slate-500 uppercase font-black tracking-tighter">
                    Ensure location services are enabled in browser
                </div>
            </div>
        </div>
    );
}

function updatePolygonLayer(map: mapboxgl.Map, vertices: GeoVertex[], hasError: boolean) {
    const sourceId = 'boundary-polygon';
    if (map.getLayer('boundary-polygon-fill')) map.removeLayer('boundary-polygon-fill');
    if (map.getLayer('boundary-polygon-outline')) map.removeLayer('boundary-polygon-outline');
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    if (vertices.length < 3) return;
    map.addSource(sourceId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...vertices.map(v => [v.lon, v.lat]), [vertices[0].lon, vertices[0].lat]]] } } });
    const color = hasError ? '#f59e0b' : '#10b981';
    map.addLayer({ id: 'boundary-polygon-fill', type: 'fill', source: sourceId, paint: { 'fill-color': color, 'fill-opacity': 0.2 } });
    map.addLayer({ id: 'boundary-polygon-outline', type: 'line', source: sourceId, paint: { 'line-color': color, 'line-width': 2, 'line-dasharray': hasError ? [2, 2] : [1] } });
}

function MapControls({ canUndo, canClear, canConfirm, onUndo, onClear, onConfirm, onCancel, statusMessage }: {
    canUndo: boolean; canClear: boolean; canConfirm: boolean;
    onUndo: () => void; onClear: () => void; onConfirm: () => void; onCancel?: () => void;
    statusMessage?: string;
}) {
    return (
        <div className="absolute bottom-10 left-6 right-6 flex flex-col gap-3 z-40">
            {statusMessage && !canConfirm && (
                <div className="text-center"><p className="text-[10px] text-amber-500 font-black uppercase tracking-widest bg-amber-500/10 py-2 rounded-full border border-amber-500/20">{statusMessage}</p></div>
            )}
            <button onClick={onConfirm} className={`w-full py-5 rounded-2xl font-black text-lg uppercase tracking-[0.2em] shadow-2xl transition-all duration-300 ${canConfirm ? 'bg-emerald-500 text-black shadow-emerald-500/40' : 'bg-gray-800 text-gray-500 opacity-50 pointer-events-none'}`} data-testid="confirm-boundary-button">Lock Site Geometry ✓</button>
            <div className="grid grid-cols-3 gap-2">
                <button onClick={onCancel} className="bg-white/5 py-3 text-white border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest">Cancel</button>
                <button onClick={onUndo} disabled={!canUndo} className="bg-white/5 py-3 text-white border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-20">Undo</button>
                <button onClick={onClear} disabled={!canClear} className="bg-red-500/10 py-3 text-red-500 border border-red-500/10 rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-20">Clear</button>
            </div>
        </div>
    );
}

function calculateArea(vertices: GeoVertex[]): number {
    if (vertices.length < 3) return 0;
    try { return GeoPolygon.create(vertices).areaSquareMeters; } catch { return 0; }
}
