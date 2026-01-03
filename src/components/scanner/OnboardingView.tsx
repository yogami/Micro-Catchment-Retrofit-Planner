import { useARScanner } from '../../hooks/useARScanner';
import { convertRainfall, getRainUnit } from '../../utils/units';

export function OnboardingView({ scanner }: { scanner: ReturnType<typeof useARScanner> }) {
    const rainfallVal = convertRainfall(scanner.rainfall, scanner.unitSystem).toFixed(2);
    const rainfallUnit = getRainUnit(scanner.unitSystem);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <StatusIcon isLoading={scanner.isLoadingRainfall} location={scanner.locationName} val={rainfallVal} unit={rainfallUnit} />
            <h2 className="text-2xl font-bold mb-2 text-white">Ready to Scan</h2>
            <p className="text-gray-400 mb-8 max-w-xs text-sm">Point your camera at a street or sidewalk to measure runoff and plan retrofits.</p>
            <button
                onClick={() => scanner.update({ isScanning: true, detectedArea: null, scanProgress: 0, isLocked: false })}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 font-semibold shadow-lg hover:scale-105 active:scale-95 transition-all text-white"
            >
                📷 Start AR Scan
            </button>
        </div>
    );
}

function StatusIcon({ isLoading, location, val, unit }: { isLoading: boolean, location: string, val: string, unit: string }) {
    return (
        <>
            <div className="mb-6 bg-blue-500/20 rounded-xl px-4 py-2 text-blue-300 text-sm">
                {isLoading ? "Detecting location & rainfall..." : `🌧️ ${location} design storm: ${val}${unit}`}
            </div>
            <div className="w-32 h-32 rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-500/50 flex items-center justify-center mb-6 animate-pulse">
                <svg className="w-16 h-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </div>
        </>
    );
}
