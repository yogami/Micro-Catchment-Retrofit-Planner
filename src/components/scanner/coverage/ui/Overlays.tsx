export function CompleteOverlay() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-testid="sweep-complete-overlay">
            <div className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold text-xl animate-pulse">
                ✓ Sweep Complete!
            </div>
        </div>
    );
}
