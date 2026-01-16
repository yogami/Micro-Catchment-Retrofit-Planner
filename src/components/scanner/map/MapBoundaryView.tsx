import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { GeoPolygon, type GeoVertex } from '../../../lib/spatial-coverage/domain/valueObjects/GeoPolygon';
import { useGPSAnchor } from '../../../hooks/scanner/useGPSAnchor';
import { ScannerHUD } from '../HUD/ScannerHUD';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export interface MapBoundaryViewProps {
    minVertices?: number;
    maxVertices?: number;
    onBoundaryConfirmed: (polygon: GeoPolygon) => void;
    onCancel?: () => void;
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

    const [vertices, setVertices] = useState<GeoVertex[]>([]);
    const [isMapReady, setIsMapReady] = useState(false);

    const gps = useGPSAnchor({ accuracyThreshold: 15 });

    const canConfirm = vertices.length >= minVertices;
    const canAddMore = vertices.length < maxVertices;

    // Initialize map when GPS is ready
    useEffect(() => {
        if (!gps.isReady || !mapContainer.current || map.current) return;
        if (!MAPBOX_TOKEN) {
            console.warn('Mapbox token not configured');
            setIsMapReady(true);
            return;
        }

        mapboxgl.accessToken = MAPBOX_TOKEN;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/satellite-streets-v12',
            center: [gps.lon!, gps.lat!],
            zoom: 19, // Zoomed in closer for site definition
            pitch: 0,
            antialias: true
        });

        map.current.on('load', () => setIsMapReady(true));

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, [gps.isReady, gps.lat, gps.lon]);

    // Add click handler for adding vertices
    useEffect(() => {
        if (!isMapReady || !map.current) return;

        const handleClick = (e: mapboxgl.MapMouseEvent) => {
            if (!canAddMore) return;

            const newVertex: GeoVertex = {
                lat: e.lngLat.lat,
                lon: e.lngLat.lng
            };

            setVertices(prev => [...prev, newVertex]);
            // Haptic feedback on tap
            if (navigator.vibrate) navigator.vibrate(20);
        };

        map.current.on('click', handleClick);

        return () => {
            map.current?.off('click', handleClick);
        };
    }, [isMapReady, canAddMore]);

    // Update markers when vertices change
    useEffect(() => {
        if (!map.current) return;

        // Clear existing markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        // Add new markers
        vertices.forEach((v) => {
            // Using a more tactical emerald dot
            const el = document.createElement('div');
            el.className = 'w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-lg shadow-emerald-500/50';

            const marker = new mapboxgl.Marker({ element: el })
                .setLngLat([v.lon, v.lat])
                .addTo(map.current!);
            markersRef.current.push(marker);
        });

        // Draw polygon if we have enough vertices
        updatePolygonLayer(map.current, vertices);
    }, [vertices]);

    const handleUndo = useCallback(() => {
        setVertices(prev => prev.slice(0, -1));
    }, []);

    const handleClear = useCallback(() => {
        setVertices([]);
    }, []);

    const handleConfirm = useCallback(() => {
        if (!canConfirm) return;

        try {
            const polygon = GeoPolygon.create(vertices);
            onBoundaryConfirmed(polygon);
        } catch (error) {
            console.error('Invalid polygon:', error);
        }
    }, [vertices, canConfirm, onBoundaryConfirmed]);

    // Fallback click handler for when Mapbox internal clicks don't fire (e.g., E2E tests)
    const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!map.current || !canAddMore) return;

        // Get click position relative to container
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Use Mapbox's unproject to convert screen coords to geo coords
        const lngLat = map.current.unproject([x, y]);

        const newVertex: GeoVertex = {
            lat: lngLat.lat,
            lon: lngLat.lng
        };

        setVertices(prev => [...prev, newVertex]);
        if (navigator.vibrate) navigator.vibrate(20);
    }, [canAddMore]);

    // Render loading state while waiting for GPS
    if (!gps.isReady) {
        return <GPSWaitingView accuracy={gps.accuracy} error={gps.error} onSpoof={gps.spoof} />;
    }

    return (
        <div className="relative w-full h-full bg-slate-950 overflow-hidden" data-testid="map-boundary-view">
            {/* 
                NOTE: Removing PlanningCameraBackground from Screen 1 
                to satisfy "Two-Screen Workflow" (Map -> AR).
                This makes the Map screen distinct and prevents the "Same Interface" confusion.
            */}

            {/* Tactical Grid / Map Container */}
            <div
                ref={mapContainer}
                className="absolute inset-0 z-10 bg-slate-900 shadow-inner"
                data-testid="map-canvas-container"
            />

            {/* Transparent Click Capture Overlay */}
            <div
                className="absolute inset-0 z-20 cursor-crosshair"
                onClick={handleContainerClick}
                data-testid="click-capture-overlay"
            />

            {/* Tactical HUD Layers - Identifies Phase */}
            <div className="absolute top-20 left-6 z-40 pointer-events-none">
                <div className="flex flex-col gap-1">
                    <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em]">Phase 01</p>
                    <h1 className="text-white text-2xl font-black uppercase tracking-tight">Site Planning</h1>
                </div>
            </div>

            <ScannerHUD color="emerald" />

            <MapInstructions
                vertexCount={vertices.length}
                minVertices={minVertices}
            />

            <MapControls
                canUndo={vertices.length > 0}
                canClear={vertices.length > 0}
                canConfirm={canConfirm && vertices.length >= 3}
                onUndo={handleUndo}
                onClear={handleClear}
                onConfirm={handleConfirm}
                onCancel={onCancel}
            />

            {/* Tactical Diagnostics - Bottom Right */}
            <div className="absolute bottom-32 right-6 z-30 bg-black/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-[10px] font-mono pointer-events-none shadow-2xl">
                <p className="text-emerald-400 font-bold mb-1">📍 {vertices.length} / {minVertices} Nodes</p>
                <p className="text-gray-400 uppercase tracking-widest text-[8px]">
                    Area: <span className="text-white">{canConfirm ? GeoPolygon.create(vertices).areaSquareMeters.toFixed(1) : '0.0'} m²</span>
                </p>
                <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, (vertices.length / minVertices) * 100)}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * GPSWaitingView - Displayed while waiting for GPS lock.
 */
function GPSWaitingView({ accuracy, error, onSpoof }: {
    accuracy: number | null;
    error: string | null;
    onSpoof: (lat: number, lon: number) => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-950 text-white p-8 text-center" data-testid="gps-waiting-view">
            <div className="relative w-24 h-24 mb-10">
                <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl animate-pulse">📡</span>
                </div>
            </div>

            <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">Acquiring GIS Fix</h2>
            <p className="text-slate-500 text-sm mb-12 font-medium max-w-[240px]">
                {error ? error : 'High-precision coordinate lock required for site planning.'}
            </p>

            {accuracy !== null && (
                <div className="bg-emerald-500/10 px-6 py-4 rounded-3xl mb-12 border border-emerald-500/20">
                    <p className="text-emerald-400 font-mono font-bold text-lg">
                        ACCURACY: ±{accuracy.toFixed(1)}M
                    </p>
                </div>
            )}

            <button
                onClick={() => onSpoof(38.8977, -77.0365)}
                className="w-full max-w-xs py-5 bg-emerald-500 text-black rounded-3xl font-black text-sm uppercase tracking-widest shadow-[0_20px_40px_rgba(16,185,129,0.3)] active:scale-95 transition-all"
            >
                Bypass & Force Fix
            </button>
            <p className="mt-4 text-[9px] text-slate-600 font-bold uppercase tracking-widest">Indoor Simulation Mode</p>
        </div>
    );
}

/**
 * MapInstructions - High-visibility instructions overlay.
 */
function MapInstructions({ vertexCount, minVertices }: {
    vertexCount: number;
    minVertices: number;
}) {
    const remaining = Math.max(0, minVertices - vertexCount);
    const message = vertexCount === 0
        ? `Tap ${minVertices} points to define area`
        : remaining > 0
            ? `Connect ${remaining} more node${remaining > 1 ? 's' : ''}`
            : `Geometry Locked • ${vertexCount} nodes`;

    return (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 w-[85%] max-w-md pointer-events-none">
            <div className="bg-black/80 backdrop-blur-xl px-6 py-4 rounded-full border border-white/10 shadow-2xl flex items-center justify-center gap-3">
                <div className={`w-2 h-2 rounded-full ${remaining === 0 ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                <p className="text-white text-[11px] font-black uppercase tracking-[0.15em]">{message}</p>
            </div>
        </div>
    );
}

/**
 * MapControls - Action buttons for the map view.
 */
function MapControls({ canUndo, canClear, canConfirm, onUndo, onClear, onConfirm, onCancel }: {
    canUndo: boolean;
    canClear: boolean;
    canConfirm: boolean;
    onUndo: () => void;
    onClear: () => void;
    onConfirm: () => void;
    onCancel?: () => void;
}) {
    return (
        <div className="absolute bottom-10 left-6 right-6 flex flex-col gap-4 z-40">
            {canConfirm && (
                <button
                    onClick={onConfirm}
                    className="w-full py-6 bg-emerald-500 text-black rounded-[2rem] font-black text-lg uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(16,185,129,0.4)] animate-in zoom-in duration-300"
                    data-testid="confirm-boundary-button"
                >
                    Confirm Boundary ✓
                </button>
            )}

            <div className="flex gap-3 h-14">
                <button
                    onClick={onCancel}
                    className="flex-1 bg-white/5 backdrop-blur-md text-white border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                >
                    Cancel
                </button>
                <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="flex-1 bg-white/5 backdrop-blur-md text-white border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-20 active:scale-95 transition-all"
                >
                    Undo
                </button>
                <button
                    onClick={onClear}
                    disabled={!canClear}
                    className="flex-1 bg-red-500/10 backdrop-blur-md text-red-500 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-20 active:scale-95 transition-all"
                >
                    Clear
                </button>
            </div>
        </div>
    );
}


/**
 * Update the polygon layer on the map.
 */
function updatePolygonLayer(map: mapboxgl.Map, vertices: GeoVertex[]) {
    const sourceId = 'boundary-polygon';
    const layerId = 'boundary-polygon-fill';

    // Remove existing layer and source
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getLayer(`${layerId}-outline`)) map.removeLayer(`${layerId}-outline`);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    if (vertices.length < 3) return;

    // Add polygon source
    map.addSource(sourceId, {
        type: 'geojson',
        data: {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    ...vertices.map(v => [v.lon, v.lat]),
                    [vertices[0].lon, vertices[0].lat] // Close the polygon
                ]]
            }
        }
    });

    // Add fill layer
    map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: {
            'fill-color': '#22c55e',
            'fill-opacity': 0.3
        }
    });

    // Add outline layer
    map.addLayer({
        id: `${layerId}-outline`,
        type: 'line',
        source: sourceId,
        paint: {
            'line-color': '#22c55e',
            'line-width': 2
        }
    });
}

