/**
 * ScannerHUD - Tactical AR overlay corners and sweep
 */
export function ScannerHUD({ color = 'emerald' }: { color?: 'emerald' | 'amber' }) {
    const colorClass = color === 'emerald' ? 'border-emerald-500' : 'border-amber-500';
    const accentClass = color === 'emerald' ? 'via-emerald-500' : 'via-amber-500';

    return (
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
            {/* Tactical Corners */}
            <div className={`absolute top-10 left-10 w-8 h-8 border-t-4 border-l-4 ${colorClass}/50 rounded-tl-lg`} />
            <div className={`absolute top-10 right-10 w-8 h-8 border-t-4 border-r-4 ${colorClass}/50 rounded-tr-lg`} />
            <div className={`absolute bottom-10 left-10 w-8 h-8 border-b-4 border-l-4 ${colorClass}/50 rounded-bl-lg`} />
            <div className={`absolute bottom-10 right-10 w-8 h-8 border-b-4 border-r-4 ${colorClass}/50 rounded-br-lg`} />

            {/* Scanning Sweep Line */}
            <div className={`absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${accentClass}/30 to-transparent top-0 animate-[scan_4s_linear_infinite]`} />

            <style>{`
                @keyframes scan {
                    0% { top: 10%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                }
            `}</style>
        </div>
    );
}
