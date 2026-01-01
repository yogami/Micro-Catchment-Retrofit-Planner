/// <reference types="@google/model-viewer" />
import type { GreenFix } from '../utils/hydrology';

interface ModelPlacementProps {
    fixes: GreenFix[];
}

// Model paths for each fix type
const MODEL_PATHS: Record<GreenFix['type'], string> = {
    rain_garden: '/models/rain_garden.glb',
    permeable_pavement: '/models/permeable_pavement.glb',
    tree_planter: '/models/tree_planter.glb',
};

// Colors for each fix type
const FIX_COLORS: Record<GreenFix['type'], string> = {
    rain_garden: 'from-blue-500 to-cyan-500',
    permeable_pavement: 'from-emerald-500 to-green-500',
    tree_planter: 'from-green-600 to-lime-500',
};

// Icons for each fix type
const FIX_ICONS: Record<GreenFix['type'], string> = {
    rain_garden: '🌿',
    permeable_pavement: '🧱',
    tree_planter: '🌳',
};

/**
 * Calculate model scale based on area
 * Normalizes to a 10m² base model
 */
function calculateScale(area: number): string {
    const baseArea = 10; // Base model represents 10m²
    const scaleFactor = Math.sqrt(area / baseArea);
    return `${scaleFactor} ${scaleFactor} ${scaleFactor}`;
}

export function ModelPlacement({ fixes }: ModelPlacementProps) {
    return (
        <div className="space-y-4">
            {fixes.map((fix, index) => (
                <div
                    key={`${fix.type}-${index}`}
                    className="bg-gray-800 rounded-2xl overflow-hidden"
                >
                    {/* 3D Model Viewer */}
                    <div className="aspect-square bg-gray-900 relative">
                        {/* @ts-expect-error model-viewer is a custom element */}
                        <model-viewer
                            data-testid={`model-${fix.type}`}
                            src={MODEL_PATHS[fix.type]}
                            alt={`${fix.type.replace('_', ' ')} 3D model`}
                            ar
                            ar-modes="webxr scene-viewer quick-look"
                            camera-controls
                            auto-rotate
                            scale={calculateScale(fix.size)}
                            shadow-intensity="1"
                            exposure="0.5"
                            style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: 'transparent',
                            }}
                        />

                        {/* AR Button Overlay */}
                        <div className="absolute bottom-4 right-4">
                            <button
                                className={`px-4 py-2 rounded-xl bg-gradient-to-r ${FIX_COLORS[fix.type]} 
                           text-white font-semibold shadow-lg flex items-center gap-2`}
                            >
                                <span>📱</span> View in AR
                            </button>
                        </div>
                    </div>

                    {/* Info Panel */}
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{FIX_ICONS[fix.type]}</span>
                                <div>
                                    <h3 className="font-semibold text-white capitalize">
                                        {fix.type.replace('_', ' ')}
                                    </h3>
                                    <p className="text-sm text-gray-400">{fix.placement}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-mono text-lg text-white">{fix.size}m²</p>
                                <p className="text-sm text-emerald-400">
                                    -{Math.round(fix.reductionRate * 100)}% runoff
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
