/**
 * MapBoundaryView - Satellite map for polygon boundary drawing.
 * 
 * Displays a Mapbox satellite map centered on user's GPS location.
 * Allows drawing a polygon by tapping points on the map.
 * 
 * CC <= 3. Uses composition for complex logic.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { GeoPolygon, type GeoVertex } from '../../../lib/spatial-coverage/domain/valueObjects/GeoPolygon';
import { useGPSAnchor } from '../../../hooks/scanner/useGPSAnchor';

// Note: In production, load from environment variable
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export interface MapBoundaryViewProps {
    /** Minimum vertices required (default: 3) */
    minVertices?: number;
    /** Maximum vertices allowed (default: 10) */
    maxVertices?: number;
    /** Callback when polygon is confirmed */
    onBoundaryConfirmed: (polygon: GeoPolygon) => void;
    /** Callback to cancel and return */
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
            setIsMapReady(true); // Still "ready" to show the UI even if the map is empty
            return;
        }

        mapboxgl.accessToken = MAPBOX_TOKEN;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/satellite-streets-v12',
            center: [gps.lon!, gps.lat!],
            zoom: 18,
            pitch: 0
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
            const marker = new mapboxgl.Marker({ color: '#22c55e' })
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

    // Render loading state while waiting for GPS
    if (!gps.isReady) {
        return <GPSWaitingView accuracy={gps.accuracy} error={gps.error} onSpoof={gps.spoof} />;
    }

    return (
        <div className="relative w-full h-full bg-gray-900 overflow-hidden" data-testid="map-boundary-view">
            <div ref={mapContainer} className="absolute inset-0 bg-gray-800">
                {!MAPBOX_TOKEN && (
                    <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 pointer-events-none opacity-20">
                        {Array.from({ length: 100 }).map((_, i) => (
                            <div key={i} className="border border-white/40" />
                        ))}
                    </div>
                )}
            </div>
            {!MAPBOX_TOKEN && (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center z-10">
                    <div className="bg-black/60 p-6 rounded-2xl border border-yellow-500/30">
                        <p className="text-yellow-500 font-bold mb-2">🗺️ Mapbox Token Missing</p>
                        <p className="text-xs text-gray-400">Please set VITE_MAPBOX_TOKEN in .env.local for satellite view.</p>
                        <p className="text-[10px] text-gray-500 mt-2">You can still tap the screen to define area nodes.</p>
                    </div>
                </div>
            )}

            <MapOverlay
                vertexCount={vertices.length}
                minVertices={minVertices}
            />

            <MapControls
                canUndo={vertices.length > 0}
                canClear={vertices.length > 0}
                canConfirm={canConfirm}
                onUndo={handleUndo}
                onClear={handleClear}
                onConfirm={handleConfirm}
                onCancel={onCancel}
            />
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
        <div className="flex flex-col items-center justify-center h-full bg-white text-black p-8 text-center" data-testid="gps-waiting-view">
            <div className="w-20 h-20 border-8 border-emerald-500 border-t-transparent rounded-full animate-spin mb-8" />
            <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">Locating Site...</h2>
            <p className="text-gray-500 text-lg mb-8 font-medium">
                {error ? error : 'Wait for accuracy or tap "Force Start" below.'}
            </p>
            {accuracy !== null && (
                <div className="bg-emerald-100 px-6 py-3 rounded-2xl mb-12 border-2 border-emerald-500">
                    <p className="text-emerald-700 font-mono font-bold text-xl">
                        Signal: ±{accuracy.toFixed(0)}m
                    </p>
                </div>
            )}
            <button
                onClick={() => onSpoof(38.8977, -77.0365)}
                className="w-full py-8 bg-black text-white rounded-3xl font-black text-2xl shadow-2xl active:scale-95 hover:bg-gray-800 transition-all"
            >
                FORCE START ✓
                <span className="block text-[10px] text-emerald-400 opacity-70 mt-1 uppercase font-black">Bypass GPS for indoor testing</span>
            </button>
        </div>
    );
}

/**
 * MapOverlay - Instructions overlay on the map.
 */
function MapOverlay({ vertexCount, minVertices }: {
    vertexCount: number;
    minVertices: number;
}) {
    const remaining = Math.max(0, minVertices - vertexCount);
    const message = vertexCount === 0
        ? `Tap ${minVertices} corners to define boundary`
        : remaining > 0
            ? `Tap ${remaining} more point${remaining > 1 ? 's' : ''}`
            : `${vertexCount} points • Tap to add more or confirm`;

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur px-4 py-2 rounded-full">
            <p className="text-white text-sm font-medium">{message}</p>
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
        <div className="absolute bottom-6 left-4 right-4 flex justify-between items-center z-20">
            <div className="flex gap-2">
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium"
                    >
                        Cancel
                    </button>
                )}
                <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                    Undo
                </button>
                <button
                    onClick={onClear}
                    disabled={!canClear}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                    Clear
                </button>
            </div>

            <button
                onClick={onConfirm}
                disabled={!canConfirm}
                className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="confirm-boundary-button"
            >
                Confirm Boundary ✓
            </button>
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
