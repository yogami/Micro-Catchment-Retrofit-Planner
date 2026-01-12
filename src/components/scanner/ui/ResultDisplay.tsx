import type { UpdateFn, ARScannerState } from '../../../hooks/useARScanner';
import { exportService, type ExportData } from '../../../lib/spatial-coverage/application/ExportService';

export function ResultHeader({ area, unit }: { area: number; unit: string }) {
    return (
        <div>
            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">Catchment Area</p>
            <div className="flex items-baseline gap-1">
                <p data-testid="locked-area-value" className="text-3xl font-mono font-black text-white">{area}</p>
                <p className="text-xs font-bold text-gray-500 uppercase">{unit}</p>
            </div>
        </div>
    );
}

export function ExportActionGroup({ scanner }: { scanner: ARScannerState }) {
    const handleExport = async (type: 'pdf' | 'obj' | 'dem') => {
        const data: ExportData = {
            siteAddress: scanner.locationName,
            areaSquareMeters: scanner.detectedArea || 0,
            coveragePercent: 97.5, // Mocked for now, should come from coverage stats
            validationStatus: (scanner.validationError !== null && scanner.validationError < 0.5) ? 'pass' : 'warning',
            calibrationAccuracy: scanner.validationError || 0,
            boundary: scanner.geoBoundary ? [] : [], // Need to convert GeoPolygon to Points if needed, or use local boundary
            elevationGrid: scanner.elevationGrid,
            timestamp: new Date()
        };

        let blob: Blob;
        let filename: string;

        if (type === 'pdf') {
            blob = await exportService.toPDFText(data);
            filename = 'catchment-report.pdf'; // Actually .txt in this simplified version
        } else if (type === 'obj') {
            const obj = exportService.toOBJ([], scanner.elevationGrid);
            blob = new Blob([obj], { type: 'text/plain' });
            filename = 'catchment-mesh.obj';
        } else {
            const csv = exportService.toDEMCSV(scanner.elevationGrid!, { lat: scanner.location?.lat || 0, lon: scanner.location?.lon || 0 });
            blob = new Blob([csv], { type: 'text/csv' });
            filename = 'catchment-dem.csv';
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5">
            <ExportButton label="PDF Report" icon="📄" onClick={() => handleExport('pdf')} color="text-white" />
            <ExportButton label="3D Mesh" icon="📦" onClick={() => handleExport('obj')} color="text-cyan-400" />
            <ExportButton label="Elev Map" icon="🗺️" onClick={() => handleExport('dem')} color="text-emerald-400" disabled={!scanner.elevationGrid} />
        </div>
    );
}

function ExportButton({ label, icon, onClick, color, disabled }: { label: string; icon: string; onClick: () => void; color: string; disabled?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`bg-gray-800/50 hover:bg-gray-800 border border-white/5 py-2 rounded-lg flex flex-col items-center gap-1 transition-all disabled:opacity-30 disabled:grayscale`}
        >
            <span className="text-sm">{icon}</span>
            <span className={`text-[8px] font-black uppercase tracking-tighter ${color}`}>{label}</span>
        </button>
    );
}

export function ResultFooter({ update, isPinn }: { update: UpdateFn; isPinn: boolean }) {
    return (
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <button onClick={() => update({ isLocked: false })} className="text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition">➕ Resume Mapping</button>
            {isPinn && <span className="px-2 py-0.5 rounded bg-purple-500/20 text-[9px] text-purple-300 border border-purple-500/30 font-black uppercase">⚡ PINN</span>}
        </div>
    );
}
