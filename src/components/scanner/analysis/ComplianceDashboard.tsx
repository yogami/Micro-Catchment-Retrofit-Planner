import type { ComplianceResult } from '../../../lib/grant-generator';

export function ComplianceDashboard({ compliance, generating, onGenerate }: {
    compliance: ComplianceResult[]; generating: boolean; onGenerate: (id: string) => void
}) {
    return (
        <div className="p-5 bg-gradient-to-br from-emerald-950/40 to-cyan-950/40 border border-emerald-500/20 rounded-3xl mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-4">Grant Eligibility Dashboard</h3>
            <div className="space-y-3">
                {compliance.map(res => (
                    <GrantCard key={res.grantProgram} res={res} generating={generating} onGenerate={onGenerate} />
                ))}
            </div>
        </div>
    );
}

function GrantCard({ res, generating, onGenerate }: {
    res: ComplianceResult; generating: boolean; onGenerate: (id: string) => void
}) {
    return (
        <div data-testid={`grant-card-${res.grantProgram}`} className="flex items-center justify-between bg-black/40 p-3 rounded-2xl border border-white/5">
            <GrantInfo res={res} />
            <GrantButton res={res} generating={generating} onGenerate={onGenerate} />
        </div>
    );
}

function GrantInfo({ res }: { res: ComplianceResult }) {
    const cls = res.eligible ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400';
    return (
        <div>
            <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-black text-white">{res.grantProgram}</p>
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-black ${cls}`}>
                    <GrantStatusLabel eligible={res.eligible} />
                </span>
            </div>
            {res.summary && <p className="text-[9px] text-gray-500 font-bold whitespace-pre-line">{res.summary}</p>}
        </div>
    );
}

function GrantStatusLabel({ eligible }: { eligible: boolean }) {
    if (eligible) return <>ELIGIBLE</>;
    return <>NOT ELIGIBLE</>;
}

function GrantButton({ res, generating, onGenerate }: { res: ComplianceResult; generating: boolean; onGenerate: (id: string) => void }) {
    return (
        <button
            onClick={() => onGenerate(res.grantProgram)}
            disabled={generating || !res.eligible}
            className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${getButtonCls(res.eligible)}`}
        >
            <ButtonLabel generating={generating} />
        </button>
    );
}

function getButtonCls(eligible: boolean) {
    if (eligible) return 'bg-emerald-500 text-white';
    return 'bg-gray-800 text-gray-600 grayscale cursor-not-allowed';
}

function ButtonLabel({ generating }: { generating: boolean }) {
    if (generating) return <>⌛ generating...</>;
    return <>📄 PRE-APP</>;
}
