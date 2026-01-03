/// <reference types="@google/model-viewer" />
import type { GreenFix } from '../utils/hydrology';

interface ModelPlacementProps {
    fixes: GreenFix[];
}

const MODEL_PATHS: Record<GreenFix['type'], string> = {
    rain_garden: '/models/rain_garden.glb',
    permeable_pavement: '/models/permeable_pavement.glb',
    tree_planter: '/models/tree_planter.glb',
};

const FIX_STYLES: Record<GreenFix['type'], { color: string; icon: string }> = {
    rain_garden: { color: 'from-blue-500 to-cyan-500', icon: '🌿' },
    permeable_pavement: { color: 'from-emerald-500 to-green-500', icon: '🧱' },
    tree_planter: { color: 'from-green-600 to-lime-500', icon: '🌳' },
};

function calculateScale(area: number): string {
    const baseArea = 10;
    const s = Math.sqrt(area / baseArea);
    return `${s} ${s} ${s}`;
}

export function ModelPlacement({ fixes }: ModelPlacementProps) {
    return (
        <div className="space-y-4">
            {fixes.map((fix, idx) => (
                <FixModelCard key={`${fix.type}-${idx}`} fix={fix} />
            ))}
        </div>
    );
}

function FixModelCard({ fix }: { fix: GreenFix }) {
    const style = FIX_STYLES[fix.type];
    return (
        <div className="bg-gray-800 rounded-2xl overflow-hidden">
            <div className="aspect-square bg-gray-900 relative">
                <ModelViewer fix={fix} />
                <ARButton color={style.color} />
            </div>
            <FixInfo fix={fix} style={style} />
        </div>
    );
}

function ModelViewer({ fix }: { fix: GreenFix }) {
    return (
        /* @ts-expect-error model-viewer is a custom element */
        <model-viewer
            data-testid={`model-${fix.type}`}
            src={MODEL_PATHS[fix.type]}
            alt={`${fix.type.replace('_', ' ')}`}
            ar
            ar-modes="webxr scene-viewer quick-look"
            camera-controls
            auto-rotate
            scale={calculateScale(fix.size)}
            shadow-intensity="1"
            exposure="0.5"
            style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
        />
    );
}

function ARButton({ color }: { color: string }) {
    return (
        <div className="absolute bottom-4 right-4">
            <button className={`px-4 py-2 rounded-xl bg-gradient-to-r ${color} text-white font-semibold shadow-lg flex items-center gap-2`}>
                <span>📱</span> View in AR
            </button>
        </div>
    );
}

function FixInfo({ fix, style }: { fix: GreenFix; style: { icon: string } }) {
    return (
        <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <span className="text-2xl">{style.icon}</span>
                <div>
                    <h3 className="font-semibold text-white capitalize">{fix.type.replace('_', ' ')}</h3>
                    <p className="text-sm text-gray-400">{fix.placement}</p>
                </div>
            </div>
            <div className="text-right">
                <p className="font-mono text-lg text-white">{fix.size}m²</p>
                <p className="text-sm text-emerald-400">-{Math.round(fix.reductionRate * 100)}% runoff</p>
            </div>
        </div>
    );
}
