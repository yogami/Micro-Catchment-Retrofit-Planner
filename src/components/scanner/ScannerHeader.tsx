import { useARScanner } from '../../hooks/useARScanner';

export function ScannerHeader({ scanner }: { scanner: ReturnType<typeof useARScanner> }) {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-700">
            <div className="flex items-center justify-between px-4 py-3">
                <Brand location={scanner.locationName} />
                <div className="flex items-center gap-3">
                    <UnitToggle system={scanner.unitSystem} onToggle={scanner.toggleUnitSystem} />
                    <UserMenu email={scanner.user?.email} onLogout={scanner.handleLogout} />
                </div>
            </div>
        </header>
    );
}

function Brand({ location }: { location: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center">
                <span className="text-sm">🌧️</span>
            </div>
            <div className="flex flex-col">
                <span className="font-semibold text-sm leading-none">Micro-Catchment</span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">{location}</span>
            </div>
        </div>
    );
}

function UnitToggle({ system, onToggle }: { system: string; onToggle: () => void }) {
    return (
        <button
            onClick={onToggle}
            className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-[10px] font-black uppercase tracking-widest text-emerald-400"
        >
            {system === 'metric' ? 'UNIT: METRIC' : 'UNIT: US/IMP'}
        </button>
    );
}

function UserMenu({ email, onLogout }: { email?: string; onLogout: () => void }) {
    return (
        <>
            <span className="text-xs text-gray-400">{email}</span>
            <button onClick={onLogout} className="text-xs text-gray-400 hover:text-white transition">Logout</button>
        </>
    );
}
