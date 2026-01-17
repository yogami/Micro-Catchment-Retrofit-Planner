import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { GeoPolygon, type GeoVertex } from '../../../lib/spatial-coverage/domain/valueObjects/GeoPolygon';
import { useGPSAnchor } from '../../../hooks/scanner/useGPSAnchor';
import { ScannerHUD } from '../HUD/ScannerHUD';
import { CoordinateTransform } from '../../../lib/spatial-coverage/domain/services/CoordinateTransform';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

// Validation Constraints
const MIN_AREA = 2;       // 2m² (Relaxed from 5)
const MAX_AREA = 3500;    // 3500m² (~0.35 hectare)
const MAX_RADIUS = 300;   // 300m from GPS anchor (Relaxed from 150)

export interface MapBoundaryViewProps {
    minVertices?: number;
    maxVertices?: number;
    onBoundaryConfirmed: (polygon: GeoPolygon) => void;
    onCancel?: () => void;
}

/**
 * MapBoundaryView - Main component for map-based boundary drawing.
 * 
 * PHASE 1: SITE PLANNING
 * - GPS-centered map initialization
 * - Click to add vertices (Nodes)
 * - Area validation & Proximity geofencing
 * - NO alignment requirement here (moved to Phase 2)
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

    const [vertices, setVertices] = useState<GeoVertex[]>([]);
    const [isMapReady, setIsMapReady] = useState(false);
    const [mapInitError, setMapInitError] = useState(false);

    // Accuracy threshold relaxed to 25m for faster acquisition / desk testing
    const gps = useGPSAnchor({ accuracyThreshold: 25 });

    // Derived Validation States
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

    // Initialize map when GPS is ready
    useEffect(() => {
        if (!gps.isReady || !mapContainer.current || map.current) return;

        // Even if we have a token, Mapbox might fail to initialize on some desktops
        if (!MAPBOX_TOKEN) {
            console.warn('Mapbox token not configured');
            setIsMapReady(false);
            return;
        }

        try {
            mapboxgl.accessToken = MAPBOX_TOKEN;

            const m = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/satellite-streets-v12',
                center: [gps.lon!, gps.lat!],
                zoom: 19.5,
                pitch: 0,
                antialias: true,
                maxZoom: 22,
                minZoom: 14
            });

            m.on('load', () => setIsMapReady(true));
            m.on('error', (e) => {
                console.error('Mapbox error:', e);
                setMapInitError(true);
            });

            map.current = m;
        } catch (err) {
            console.error('Mapbox init failed:', err);
            setMapInitError(true);
        }

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, [gps.isReady, gps.lat, gps.lon]);

    // Update markers when vertices change
    useEffect(() => {
        if (!map.current || !isMapReady) return;

        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        vertices.forEach((v) => {
            const el = document.createElement('div');
            el.className = `w-4 h-4 rounded-full border-2 border-white shadow-lg transition-all duration-300 ${isTooFar ? 'bg-amber-500 scale-125' : 'bg-emerald-500'
                }`;

            const marker = new mapboxgl.Marker({ element: el })
                .setLngLat([v.lon, v.lat])
                .addTo(map.current!);
            markersRef.current.push(marker);
        });

        updatePolygonLayer(map.current, vertices, isAreaTooSmall || isAreaTooLarge || isTooFar);
    }, [vertices, isTooFar, isAreaTooSmall, isAreaTooLarge, isMapReady]);

    const handleUndo = useCallback(() => {
        setVertices(prev => prev.slice(0, -1));
    }, []);

    const handleClear = useCallback(() => {
        setVertices([]);
    }, []);

    const handleConfirm = useCallback(() => {
        if (!isValid) return;

        try {
            const polygon = GeoPolygon.create(vertices);
            onBoundaryConfirmed(polygon);
        } catch (error) {
            console.error('Invalid polygon:', error);
        }
    }, [vertices, isValid, onBoundaryConfirmed]);

    const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const canAddMore = vertices.length < maxVertices;
        if (!canAddMore) return;

        let newVertex: GeoVertex;

        if (map.current && isMapReady) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const lngLat = map.current.unproject([x, y]);
            newVertex = { lat: lngLat.lat, lon: lngLat.lng };
        } else {
            // "Blind" fallback: Use pixel offsets from center as rough meter offsets
            const rect = e.currentTarget.getBoundingClientRect();
            const dx = (e.clientX - rect.left - rect.width / 2) * 0.1;
            const dy = (rect.height / 2 - (e.clientY - rect.top)) * 0.1;
            newVertex = {
                lat: (gps.lat || 0) + (dy / 111320),
                lon: (gps.lon || 0) + (dx / (111320 * Math.cos((gps.lat || 0) * Math.PI / 180)))
            };
        }

        setVertices(prev => [...prev, newVertex]);
        if (navigator.vibrate) navigator.vibrate(20);
    }, [vertices.length, maxVertices, gps.lat, gps.lon, isMapReady]);

    if (!gps.isReady) {
        return <GPSWaitingView accuracy={gps.accuracy} error={gps.error} onSpoof={gps.spoof} />;
    }

    const showFallback = !MAPBOX_TOKEN || !isMapReady || mapInitError;

    return (
        <div className="relative w-full h-full bg-slate-950 overflow-hidden" data-testid="map-boundary-view">
            {/* Tactical Grid / Map Container */}
            <div
                ref={mapContainer}
                className={`absolute inset-0 z-10 ${!showFallback ? 'bg-transparent' : 'bg-slate-900'} shadow-inner flex items-center justify-center`}
                data-testid="map-canvas-container"
            >
                {showFallback && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-1000">
                        {/* Dynamic Grid lines */}
                        <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 gap-px opacity-60">
                            {Array.from({ length: 144 }).map((_, i) => (
                                <div key={i} className="border-[0.5px] border-emerald-500/40" />
                            ))}
                        </div>

                        {/* Scanning beam effect */}
                        <div className="absolute top-10 left-0 right-0 h-1.5 bg-gradient-to-b from-emerald-500/50 to-transparent animate-[scan_8s_linear_infinite]" />

                        <div className="border border-emerald-500/20 bg-black/60 backdrop-blur-xl px-10 py-8 rounded-[2.5rem] text-center max-w-xs animate-in fade-in zoom-in duration-1000">
                            {!mapInitError && MAPBOX_TOKEN ? (
                                <>
                                    <div className="w-10 h-10 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
                                    <p className="text-white text-xs font-black uppercase tracking-[0.2em] mb-1">Engaging Satellites</p>
                                    <p className="text-emerald-500/50 text-[9px] font-bold uppercase tracking-widest">Awaiting Tile Data Stream...</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-emerald-500 text-3xl mb-4">🛰️</p>
                                    <p className="text-white text-xs font-black uppercase tracking-[0.2em] mb-1">Direct GPS Mode</p>
                                    <p className="text-emerald-500/50 text-[9px] font-bold uppercase tracking-widest leading-relaxed mb-6">
                                        Satellite Link Restricted. <br />
                                        Tap grid to define region.
                                    </p>
                                    <button
                                        onClick={() => setMapInitError(true)}
                                        className="text-[8px] text-emerald-400 font-black border border-emerald-500/30 px-4 py-2 rounded-full hover:bg-emerald-500/10 transition-colors pointer-events-auto"
                                    >
                                        PLAN BLIND (GPS ONLY)
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Transparent Click Capture Overlay - ALWAYS present to ensure reliability */}
            <div className="absolute inset-0 z-20 cursor-crosshair" onClick={handleContainerClick} data-testid="click-capture-overlay" />

            <ScannerHUD color={isTooFar || isAreaTooLarge ? 'amber' : 'emerald'} />

            {/* Top Phase Header */}
            <div className="absolute top-20 left-6 z-40 pointer-events-none">
                <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">PHASE 01</p>
                <h1 className="text-white text-2xl font-black uppercase tracking-tight">Site Planning</h1>
            </div>

            {/* Dynamic Status / Instructions */}
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
                onUndo={handleUndo}
                onClear={handleClear}
                onConfirm={handleConfirm}
                onCancel={onCancel}
                statusMessage={isTooFar ? "Out of safe range" : isAreaTooLarge ? "Above max area" : isAreaTooSmall ? "Area too small" : ""}
            />

            {/* Diagnostics Panel - Cleaned Up */}
            <div className="absolute bottom-32 right-6 z-30 bg-black/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-[9px] font-mono pointer-events-none shadow-2xl min-w-[140px]">
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
                </div>
            </div>
        </div>
    );
}

function calculateArea(vertices: GeoVertex[]): number {
    if (vertices.length < 3) return 0;
    try {
        return GeoPolygon.create(vertices).areaSquareMeters;
    } catch { return 0; }
}

function GPSWaitingView({ accuracy, error, onSpoof }: {
    accuracy: number | null;
    error: string | null;
    onSpoof: (lat: number, lon: number) => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-950 text-white p-8 text-center" data-testid="gps-waiting-view">
            <div className="relative w-20 h-20 mb-8">
                <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="absolute inset-0 flex items-center justify-center text-2xl">📡</span>
            </div>
            <h2 className="text-xl font-black mb-2 uppercase tracking-tight">Signal Acquisition</h2>
            <p className="text-slate-500 text-xs mb-10 max-w-[240px]">
                {error || 'Scanning for high-precision GPS lock...'}
            </p>
            {accuracy !== null && (
                <div className="bg-emerald-500/10 px-6 py-3 rounded-full mb-10 border border-emerald-500/20">
                    <p className="text-emerald-400 font-mono font-bold text-sm tracking-widest">±{accuracy.toFixed(1)}M</p>
                </div>
            )}
            <button onClick={() => onSpoof(52.5208, 13.4094)} className="w-full max-w-xs py-4 bg-emerald-500 text-black rounded-full font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                Manual Fix
            </button>
        </div>
    );
}

function MapControls({ canUndo, canClear, canConfirm, onUndo, onClear, onConfirm, onCancel, statusMessage }: {
    canUndo: boolean; canClear: boolean; canConfirm: boolean;
    onUndo: () => void; onClear: () => void; onConfirm: () => void; onCancel?: () => void;
    statusMessage?: string;
}) {
    return (
        <div className="absolute bottom-10 left-6 right-6 flex flex-col gap-3 z-40">
            {statusMessage && !canConfirm && (
                <div className="text-center">
                    <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest bg-amber-500/10 py-2 rounded-full border border-amber-500/20">
                        {statusMessage}
                    </p>
                </div>
            )}
            <button
                onClick={onConfirm}
                className={`w-full py-5 rounded-2xl font-black text-lg uppercase tracking-[0.2em] shadow-2xl transition-all duration-300 ${canConfirm ? 'bg-emerald-500 text-black shadow-emerald-500/40' : 'bg-gray-800 text-gray-500 opacity-50 pointer-events-none'
                    }`}
                data-testid="confirm-boundary-button"
            >
                Lock Site Geometry ✓
            </button>
            <div className="grid grid-cols-3 gap-2">
                <button onClick={onCancel} className="bg-white/5 py-3 text-white border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest">Cancel</button>
                <button onClick={onUndo} disabled={!canUndo} className="bg-white/5 py-3 text-white border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-20">Undo</button>
                <button onClick={onClear} disabled={!canClear} className="bg-red-500/10 py-3 text-red-500 border border-red-500/10 rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-20">Clear</button>
            </div>
        </div>
    );
}

function updatePolygonLayer(map: mapboxgl.Map, vertices: GeoVertex[], hasError: boolean) {
    const sourceId = 'boundary-polygon';
    const layerId = 'boundary-polygon-fill';
    const color = hasError ? '#f59e0b' : '#10b981';

    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getLayer(`${layerId}-outline`)) map.removeLayer(`${layerId}-outline`);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    if (vertices.length < 3) return;

    map.addSource(sourceId, {
        type: 'geojson',
        data: {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'Polygon',
                coordinates: [[...vertices.map(v => [v.lon, v.lat]), [vertices[0].lon, vertices[0].lat]]]
            }
        }
    });

    map.addLayer({ id: layerId, type: 'fill', source: sourceId, paint: { 'fill-color': color, 'fill-opacity': 0.2 } });
    map.addLayer({ id: `${layerId}-outline`, type: 'line', source: sourceId, paint: { 'line-color': color, 'line-width': 2, 'line-dasharray': hasError ? [2, 2] : [1] } });
}
