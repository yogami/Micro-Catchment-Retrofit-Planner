import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { exportProjectPDF } from '../services/pdfExport';
import { computePeakRunoff, RUNOFF_COEFFICIENTS } from '../utils/hydrology';
import type { Project } from '../types/database';

export function ProjectView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [shareUrl, setShareUrl] = useState<string>('');
    const [copied, setCopied] = useState(false);
    const [exportingPDF, setExportingPDF] = useState(false);
    const projectCardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id) {
            loadProject(id);
        }
    }, [id]);

    const loadProject = async (projectId: string) => {
        setLoading(true);
        const { data, error } = await projectService.getById(projectId);
        if (error) {
            setError(error.message);
        } else if (data) {
            setProject(data);
            setShareUrl(`${window.location.origin}${data.share_url}`);
        }
        setLoading(false);
    };

    const copyShareUrl = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExportPDF = async () => {
        if (!project) return;

        setExportingPDF(true);
        try {
            const peakRunoff = computePeakRunoff(
                50, // Default Berlin rainfall
                Number(project.total_area),
                RUNOFF_COEFFICIENTS.impervious
            );

            await exportProjectPDF({
                streetName: project.street_name,
                latitude: 52.52, // Berlin default
                longitude: 13.405,
                rainfall: 50,
                totalArea: Number(project.total_area),
                totalReduction: Number(project.total_reduction),
                features: project.features || [],
                peakRunoff,
                screenshotElement: projectCardRef.current,
            });
        } catch (error) {
            console.error('PDF export failed:', error);
            alert('PDF export failed. Please try again.');
        } finally {
            setExportingPDF(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
                <p className="text-red-400 mb-4">{error || 'Project not found'}</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-6 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
                >
                    Go Home
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-700">
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={() => navigate('/scanner')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="font-semibold truncate max-w-[200px]">{project.street_name}</h1>
                    <div className="w-8" />
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-20 pb-8 px-4">
                {/* Project Card */}
                <div
                    ref={projectCardRef}
                    id="ar-container"
                    className="bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 rounded-2xl overflow-hidden mb-6 border border-emerald-500/20"
                >
                    {/* Screenshot Placeholder */}
                    <div className="aspect-video bg-gray-800 relative">
                        <div className="absolute inset-4 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center justify-center">
                            <span className="text-red-400 font-mono">{project.total_area}m² detected</span>
                        </div>
                        {/* Success Badge */}
                        <div className="absolute top-4 right-4 bg-emerald-500 rounded-full px-3 py-1 text-sm font-semibold">
                            ✓ Saved
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="p-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-2xl font-bold">{project.total_area}</p>
                                <p className="text-xs text-gray-400">m² scanned</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{project.features?.length || 0}</p>
                                <p className="text-xs text-gray-400">fixes</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-emerald-400">{Math.round(project.total_reduction)}%</p>
                                <p className="text-xs text-gray-400">reduction</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Green Fixes */}
                <div className="bg-gray-800 rounded-2xl p-4 mb-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500" />
                        Green Infrastructure Fixes
                    </h3>
                    <div className="space-y-2">
                        {(project.features || []).map((fix, i) => (
                            <div key={i} className="flex items-center justify-between bg-gray-700/50 rounded-xl p-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">
                                        {fix.type === 'rain_garden' ? '🌿' : fix.type === 'permeable_pavement' ? '🧱' : '🌳'}
                                    </span>
                                    <div>
                                        <p className="font-medium text-sm capitalize">
                                            {fix.type.replace('_', ' ')}
                                        </p>
                                        <p className="text-xs text-gray-400">{fix.placement}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono text-sm">{fix.size}m²</p>
                                    <p className="text-xs text-emerald-400">-{Math.round(fix.reductionRate * 100)}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Share URL */}
                <div className="bg-gray-800 rounded-2xl p-4 mb-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <span>🔗</span> Share Link
                    </h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={shareUrl}
                            readOnly
                            className="flex-1 px-3 py-2 rounded-lg bg-gray-700 text-sm text-gray-300 font-mono truncate"
                        />
                        <button
                            onClick={copyShareUrl}
                            className={`px-4 py-2 rounded-lg font-semibold transition ${copied
                                ? 'bg-emerald-500 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                        >
                            {copied ? '✓' : '📋'}
                        </button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={handleExportPDF}
                        disabled={exportingPDF}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 
                      font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                    >
                        {exportingPDF ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Generating PDF...
                            </span>
                        ) : (
                            '📄 Export PDF Report'
                        )}
                    </button>
                    <button
                        onClick={() => navigate('/scanner')}
                        className="w-full py-4 rounded-xl bg-gray-800 font-semibold 
                      hover:bg-gray-700 transition-all"
                    >
                        📷 Scan Another Street
                    </button>
                </div>
            </main>
        </div>
    );
}
