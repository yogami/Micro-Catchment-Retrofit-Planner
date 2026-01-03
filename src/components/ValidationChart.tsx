import { useState, useEffect } from 'react';
import { HEC_RAS_DATA, HEC_RAS_PEAK, getHecRasPeakLs } from '../utils/hecRasConstants';

interface ValidationChartProps {
    appPrediction: number;
    showDownload?: boolean;
}

const DIM = { width: 280, height: 120, padding: { top: 10, right: 10, bottom: 25, left: 35 } };

export function ValidationChart({ appPrediction, showDownload = true }: ValidationChartProps) {
    const progress = useChartAnimation();
    const hecRasPeakLs = getHecRasPeakLs();
    const accuracy = Math.round((1 - Math.abs(appPrediction - hecRasPeakLs) / hecRasPeakLs) * 100);

    return (
        <div className="bg-gray-800/80 rounded-xl p-3 backdrop-blur">
            <ChartHeader accuracy={accuracy} />
            <ChartContent appPrediction={appPrediction} progress={progress} />
            <ChartSummary app={appPrediction} refVal={hecRasPeakLs} />
            {showDownload && <DownloadLink />}
        </div>
    );
}

function useChartAnimation() {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        let start: number;
        const animate = (now: number) => {
            if (!start) start = now;
            const p = Math.min((now - start) / 1000, 1);
            setProgress(p);
            if (p < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, []);
    return progress;
}

function ChartHeader({ accuracy }: { accuracy: number }) {
    const color = accuracy >= 95 ? 'text-emerald-400' : accuracy >= 90 ? 'text-yellow-400' : 'text-red-400';
    return (
        <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-300">HEC-RAS Validation</h4>
            <span className={`text-xs font-mono ${color}`}>{accuracy}% accurate</span>
        </div>
    );
}

function ChartContent({ appPrediction, progress }: { appPrediction: number; progress: number }) {
    const chartW = DIM.width - DIM.padding.left - DIM.padding.right;
    const chartH = DIM.height - DIM.padding.top - DIM.padding.bottom;
    const xScale = (t: number) => DIM.padding.left + (t / 60) * chartW;
    const yScale = (d: number) => DIM.padding.top + chartH - (d / 0.08) * chartH;

    const path = HEC_RAS_DATA.map((d, i) =>
        `${i === 0 ? 'M' : 'L'} ${xScale(d.time)} ${yScale(d.discharge * progress)}`
    ).join(' ');

    return (
        <svg width={DIM.width} height={DIM.height} className="w-full" viewBox={`0 0 ${DIM.width} ${DIM.height}`}>
            <ChartGrid yScale={yScale} />
            <ChartAxes yScale={yScale} xScale={xScale} />
            <path d={path} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
            <circle cx={xScale(20)} cy={yScale(HEC_RAS_PEAK * progress)} r="4" fill="#3B82F6" />
            <circle cx={xScale(20)} cy={yScale((appPrediction / 1000) * progress)} r="5" fill="#10B981" stroke="#fff" strokeWidth="1.5" />
            <ChartLegend />
        </svg>
    );
}

function ChartGrid({ yScale }: { yScale: (v: number) => number }) {
    return (
        <>
            {[0, 0.02, 0.04, 0.06, 0.08].map(v => (
                <line key={v} x1={DIM.padding.left} y1={yScale(v)} x2={DIM.width - DIM.padding.right} y2={yScale(v)} stroke="#374151" />
            ))}
        </>
    );
}

function ChartAxes({ yScale, xScale }: { yScale: (v: number) => number; xScale: (t: number) => number }) {
    return (
        <>
            <line x1={DIM.padding.left} y1={DIM.height - DIM.padding.bottom} x2={DIM.width - DIM.padding.right} y2={DIM.height - DIM.padding.bottom} stroke="#6B7280" />
            <line x1={DIM.padding.left} y1={DIM.padding.top} x2={DIM.padding.left} y2={DIM.height - DIM.padding.bottom} stroke="#6B7280" />
            {[0, 20, 60].map(t => <text key={t} x={xScale(t)} y={DIM.height - 8} fill="#9CA3AF" fontSize="8" textAnchor="middle">{t}m</text>)}
            {[0, 80].map(v => <text key={v} x={DIM.padding.left - 5} y={yScale(v / 1000) + 3} fill="#9CA3AF" fontSize="8" textAnchor="end">{v}</text>)}
        </>
    );
}

function ChartLegend() {
    return (
        <>
            <circle cx={DIM.width - 70} cy={12} r="3" fill="#3B82F6" />
            <text x={DIM.width - 63} y={15} fill="#9CA3AF" fontSize="8">HEC-RAS</text>
            <circle cx={DIM.width - 70} cy={24} r="3" fill="#10B981" />
            <text x={DIM.width - 63} y={27} fill="#9CA3AF" fontSize="8">App</text>
        </>
    );
}

function ChartSummary({ app, refVal }: { app: number; refVal: number }) {
    return (
        <div className="mt-2 flex items-center justify-between text-[10px]">
            <div><span className="text-gray-400">App: </span><span className="text-emerald-400 font-mono">{app.toFixed(1)} L/s</span></div>
            <div><span className="text-gray-400">HEC-RAS: </span><span className="text-blue-400 font-mono">{refVal.toFixed(1)} L/s</span></div>
        </div>
    );
}

function DownloadLink() {
    return (
        <a href="/hec-ras-fairfax.csv" download className="mt-2 block text-center text-[10px] text-cyan-400 underline">
            📥 Download validation data (CSV)
        </a>
    );
}
