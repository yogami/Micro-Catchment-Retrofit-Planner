import { useState, useEffect } from 'react';

// HEC-RAS reference data for Fairfax 120m² scenario
const HEC_RAS_DATA = [
    { time: 0, discharge: 0.000 },
    { time: 5, discharge: 0.013 },
    { time: 10, discharge: 0.037 },
    { time: 15, discharge: 0.057 },
    { time: 20, discharge: 0.076 }, // Peak
    { time: 25, discharge: 0.072 },
    { time: 30, discharge: 0.063 },
    { time: 35, discharge: 0.053 },
    { time: 40, discharge: 0.042 },
    { time: 45, discharge: 0.030 },
    { time: 50, discharge: 0.018 },
    { time: 55, discharge: 0.008 },
    { time: 60, discharge: 0.000 },
];

const HEC_RAS_PEAK = 0.076; // m³/s = 76 L/s

interface ValidationChartProps {
    appPrediction: number; // L/s
    showDownload?: boolean;
}

export function ValidationChart({ appPrediction, showDownload = true }: ValidationChartProps) {
    const [animationProgress, setAnimationProgress] = useState(0);

    // Animate chart on mount
    useEffect(() => {
        const duration = 1000;
        const start = performance.now();

        const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            setAnimationProgress(progress);
            if (progress < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }, []);

    // Calculate accuracy
    const hecRasPeakLs = HEC_RAS_PEAK * 1000; // Convert to L/s
    const accuracy = Math.round((1 - Math.abs(appPrediction - hecRasPeakLs) / hecRasPeakLs) * 100);
    const accuracyColor = accuracy >= 95 ? 'text-emerald-400' : accuracy >= 90 ? 'text-yellow-400' : 'text-red-400';

    // SVG dimensions
    const width = 280;
    const height = 120;
    const padding = { top: 10, right: 10, bottom: 25, left: 35 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Scale functions
    const xScale = (t: number) => padding.left + (t / 60) * chartWidth;
    const yScale = (d: number) => padding.top + chartHeight - (d / 0.08) * chartHeight;

    // Generate path for HEC-RAS line
    const pathPoints = HEC_RAS_DATA.map((d, i) => {
        const x = xScale(d.time);
        const y = yScale(d.discharge * animationProgress);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    // App prediction point position (at peak time = 20 min)
    const appY = yScale((appPrediction / 1000) * animationProgress);
    const peakX = xScale(20);

    return (
        <div className="bg-gray-800/80 rounded-xl p-3 backdrop-blur">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-300">HEC-RAS Validation</h4>
                <span className={`text-xs font-mono ${accuracyColor}`}>
                    {accuracy}% accurate
                </span>
            </div>

            {/* SVG Chart */}
            <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`}>
                {/* Grid lines */}
                {[0, 0.02, 0.04, 0.06, 0.08].map(v => (
                    <line
                        key={v}
                        x1={padding.left}
                        y1={yScale(v)}
                        x2={width - padding.right}
                        y2={yScale(v)}
                        stroke="#374151"
                        strokeWidth="1"
                    />
                ))}

                {/* X-axis */}
                <line
                    x1={padding.left}
                    y1={height - padding.bottom}
                    x2={width - padding.right}
                    y2={height - padding.bottom}
                    stroke="#6B7280"
                    strokeWidth="1"
                />

                {/* Y-axis */}
                <line
                    x1={padding.left}
                    y1={padding.top}
                    x2={padding.left}
                    y2={height - padding.bottom}
                    stroke="#6B7280"
                    strokeWidth="1"
                />

                {/* X-axis labels */}
                {[0, 20, 40, 60].map(t => (
                    <text
                        key={t}
                        x={xScale(t)}
                        y={height - 8}
                        fill="#9CA3AF"
                        fontSize="8"
                        textAnchor="middle"
                    >
                        {t}min
                    </text>
                ))}

                {/* Y-axis labels */}
                {[0, 40, 80].map(v => (
                    <text
                        key={v}
                        x={padding.left - 5}
                        y={yScale(v / 1000) + 3}
                        fill="#9CA3AF"
                        fontSize="8"
                        textAnchor="end"
                    >
                        {v}
                    </text>
                ))}

                {/* Y-axis title */}
                <text
                    x={8}
                    y={height / 2}
                    fill="#9CA3AF"
                    fontSize="8"
                    textAnchor="middle"
                    transform={`rotate(-90, 8, ${height / 2})`}
                >
                    L/s
                </text>

                {/* HEC-RAS line */}
                <path
                    d={pathPoints}
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* HEC-RAS peak marker */}
                <circle
                    cx={peakX}
                    cy={yScale(HEC_RAS_PEAK * animationProgress)}
                    r="4"
                    fill="#3B82F6"
                />

                {/* App prediction marker */}
                <circle
                    cx={peakX}
                    cy={appY}
                    r="5"
                    fill="#10B981"
                    stroke="#fff"
                    strokeWidth="1.5"
                />

                {/* Legend */}
                <circle cx={width - 70} cy={12} r="3" fill="#3B82F6" />
                <text x={width - 63} y={15} fill="#9CA3AF" fontSize="8">HEC-RAS</text>

                <circle cx={width - 70} cy={24} r="3" fill="#10B981" />
                <text x={width - 63} y={27} fill="#9CA3AF" fontSize="8">App</text>
            </svg>

            {/* Comparison */}
            <div className="mt-2 flex items-center justify-between text-[10px]">
                <div>
                    <span className="text-gray-400">App: </span>
                    <span className="text-emerald-400 font-mono">{appPrediction.toFixed(1)} L/s</span>
                </div>
                <div>
                    <span className="text-gray-400">HEC-RAS: </span>
                    <span className="text-blue-400 font-mono">{hecRasPeakLs.toFixed(1)} L/s</span>
                </div>
            </div>

            {/* Download link */}
            {showDownload && (
                <a
                    href="/hec-ras-fairfax.csv"
                    download="hec-ras-fairfax.csv"
                    className="mt-2 block text-center text-[10px] text-cyan-400 hover:text-cyan-300 underline"
                >
                    📥 Download validation data (CSV)
                </a>
            )}
        </div>
    );
}

// Helper to get HEC-RAS peak for comparison
export function getHecRasPeakLs(): number {
    return HEC_RAS_PEAK * 1000;
}

export { HEC_RAS_DATA, HEC_RAS_PEAK };
