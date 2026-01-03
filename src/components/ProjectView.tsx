import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { exportProjectPDF } from '../services/pdfExport';
import { computePeakRunoff, RUNOFF_COEFFICIENTS, type GreenFix } from '../utils/hydrology';
import type { Project } from '../types/database';

export function ProjectView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { project, loading, error, exportingPDF, handleExportPDF } = useProject(id);
    const cardRef = useRef<HTMLDivElement>(null);

    const errorMessage = getError(error, project);
    if (loading) return <LoadingSpinner />;
    if (errorMessage) return <ErrorView error={errorMessage} onBack={() => navigate('/')} />;

    return (
        <ProjectLayout
            project={project!}
            cardRef={cardRef}
            exporting={exportingPDF}
            onExport={() => handleExportPDF(cardRef.current)}
            onBack={() => navigate('/scanner')}
            onScan={() => navigate('/scanner')}
        />
    );
}

function getError(error: string | null, project: Project | null): string | null {
    if (error) return error;
    if (!project) return "Project not found";
    return null;
}

interface ProjectLayoutProps {
    project: Project;
    cardRef: React.RefObject<HTMLDivElement | null>;
    exporting: boolean;
    onExport: () => void;
    onBack: () => void;
    onScan: () => void;
}

function ProjectLayout({ project, cardRef, exporting, onExport, onBack, onScan }: ProjectLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <ProjectHeader name={project.street_name} onBack={onBack} />
            <main className="pt-20 pb-8 px-4">
                <ProjectStatsCard project={project} cardRef={cardRef} />
                <FixesList features={project.features || []} />
                <ShareSection shareUrl={`${window.location.origin}${project.share_url}`} />
                <ActionButtons onExport={onExport} exporting={exporting} onScan={onScan} />
            </main>
        </div>
    );
}

function useProject(id?: string) {
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exportingPDF, setExportingPDF] = useState(false);

    const loadData = useCallback(async (pid: string) => {
        setLoading(true);
        const { data, error: err } = await projectService.getById(pid);
        if (err) setError(err.message);
        else setProject(data);
        setLoading(false);
    }, []);

    useEffect(() => { if (id) loadData(id); }, [id, loadData]);

    const handleExport = async (el: HTMLDivElement | null) => {
        if (!project) return;
        setExportingPDF(true);
        try {
            await runExport(project, el);
        } catch { alert('PDF export failed.'); }
        finally { setExportingPDF(false); }
    };

    return { project, loading, error, exportingPDF, handleExportPDF: handleExport };
}

async function runExport(project: Project, el: HTMLDivElement | null) {
    const peakRunoff = computePeakRunoff(50, Number(project.total_area), RUNOFF_COEFFICIENTS.impervious);
    await exportProjectPDF({
        streetName: project.street_name, latitude: 52.52, longitude: 13.405,
        rainfall: 50, totalArea: Number(project.total_area), totalReduction: Number(project.total_reduction),
        features: project.features || [], peakRunoff, screenshotElement: el
    });
}

function LoadingSpinner() {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
}

function ErrorView({ error, onBack }: { error: string | null; onBack: () => void }) {
    if (!error) return null;
    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={onBack} className="px-6 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition">Go Home</button>
        </div>
    );
}

function ProjectHeader({ name, onBack }: { name: string; onBack: () => void }) {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-700 flex items-center justify-between px-4 py-3">
            <button onClick={onBack} className="text-gray-400 hover:text-white transition">←</button>
            <h1 className="font-semibold truncate max-w-[200px]">{name}</h1>
            <div className="w-8" />
        </header>
    );
}

function ProjectStatsCard({ project, cardRef }: { project: Project; cardRef: React.RefObject<HTMLDivElement | null> }) {
    return (
        <div ref={cardRef} className="bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 rounded-2xl overflow-hidden mb-6 border border-emerald-500/20">
            <div className="aspect-video bg-gray-800 relative flex items-center justify-center">
                <span className="text-red-400 font-mono">{project.total_area}m² detected</span>
                <div className="absolute top-4 right-4 bg-emerald-500 rounded-full px-3 py-1 text-sm font-semibold">✓ Saved</div>
            </div>
            <div className="p-4 grid grid-cols-3 gap-4 text-center">
                <Stat val={String(project.total_area)} label="m² scanned" />
                <Stat val={String(project.features?.length || 0)} label="fixes" />
                <Stat val={`${Math.round(project.total_reduction)}%`} label="reduction" color="text-emerald-400" />
            </div>
        </div>
    );
}

function Stat({ val, label, color = "" }: { val: string; label: string; color?: string }) {
    return (
        <div>
            <p className={`text-2xl font-bold ${color}`}>{val}</p>
            <p className="text-xs text-gray-400">{label}</p>
        </div>
    );
}

function FixesList({ features }: { features: GreenFix[] }) {
    return (
        <div className="bg-gray-800 rounded-2xl p-4 mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">Green Infrastructure Fixes</h3>
            <div className="space-y-2">
                {features.map((fix, i) => <FixItem key={i} fix={fix} />)}
            </div>
        </div>
    );
}

function FixItem({ fix }: { fix: GreenFix }) {
    const icon = fix.type === 'rain_garden' ? '🌿' : fix.type === 'permeable_pavement' ? '🧱' : '🌳';
    return (
        <div className="flex items-center justify-between bg-gray-700/50 rounded-xl p-3">
            <div className="flex items-center gap-3">
                <span className="text-lg">{icon}</span>
                <div>
                    <p className="font-medium text-sm capitalize">{fix.type.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-400">{fix.placement}</p>
                </div>
            </div>
            <div className="text-right">
                <p className="font-mono text-sm">{fix.size}m²</p>
                <p className="text-xs text-emerald-400">-{Math.round(fix.reductionRate * 100)}%</p>
            </div>
        </div>
    );
}

function ShareSection({ shareUrl }: { shareUrl: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    return (
        <div className="bg-gray-800 rounded-2xl p-4 mb-6">
            <h3 className="font-semibold mb-3">🔗 Share Link</h3>
            <div className="flex gap-2">
                <input type="text" value={shareUrl} readOnly className="flex-1 px-3 py-2 rounded-lg bg-gray-700 text-sm font-mono truncate" />
                <button onClick={copy} className={`px-4 py-2 rounded-lg font-semibold ${copied ? 'bg-emerald-500' : 'bg-gray-700'}`}>{copied ? '✓' : '📋'}</button>
            </div>
        </div>
    );
}

function ActionButtons({ onExport, exporting, onScan }: { onExport: () => void; exporting: boolean; onScan: () => void }) {
    return (
        <div className="space-y-3">
            <button onClick={onExport} disabled={exporting} className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold disabled:opacity-50">
                {exporting ? 'Generating PDF...' : '📄 Export PDF Report'}
            </button>
            <button onClick={onScan} className="w-full py-4 rounded-xl bg-gray-800 font-semibold">📷 Scan Another Street</button>
        </div>
    );
}
