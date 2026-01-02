import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LandingPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const { signInWithEmail, user, signInAsDemo } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    if (user) {
        navigate('/scanner');
        return null;
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        const { error } = await signInWithEmail(email);

        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({ type: 'success', text: 'Check your email for the login link!' });
        }

        setIsLoading(false);
    };

    const handleDemoFairfax = async () => {
        setIsLoading(true);
        if (signInAsDemo) {
            await signInAsDemo();
            // Pass state to scanner to auto-start scenario
            navigate('/scanner', { state: { demoScenario: 'fairfax' } });
        }
    };

    const handleDemoBerlin = async () => {
        setIsLoading(true);
        if (signInAsDemo) {
            await signInAsDemo();
            navigate('/scanner', { state: { demoScenario: 'berlin' } });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-cyan-800 to-emerald-700 flex flex-col">
            {/* Hero Section */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
                {/* Logo/Icon */}
                <div className="mb-8 relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center shadow-2xl">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                        </svg>
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center">
                        <span className="text-sm">🌧️</span>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                    Micro-Catchment
                    <span className="block text-emerald-300">Retrofit Planner</span>
                </h1>

                {/* Tagline */}
                <p className="text-lg md:text-xl text-cyan-100 mb-8 max-w-md">
                    AR street scanning for flood resilience.
                    <span className="block mt-2 font-medium">Visual concepts in minutes → Grant-ready proposals</span>
                </p>

                {/* Features */}
                <div className="flex flex-wrap justify-center gap-4 mb-10 text-sm">
                    <div className="bg-white/10 backdrop-blur rounded-full px-4 py-2 text-white flex items-center gap-2">
                        <span>📱</span> AR Scan Streets
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-full px-4 py-2 text-white flex items-center gap-2">
                        <span>🌿</span> Smart Sizing
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-full px-4 py-2 text-white flex items-center gap-2">
                        <span>📄</span> PDF Export
                    </div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleSubmit} className="w-full max-w-sm">
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl">
                        <label htmlFor="email" className="block text-left text-sm font-medium text-cyan-100 mb-2">
                            Enter your email to start
                        </label>
                        <div className="flex flex-col gap-3">
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@city.berlin.de"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-white/90 text-gray-900 placeholder-gray-500 
                          focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                            />
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 
                          text-white font-semibold shadow-lg hover:shadow-xl 
                          hover:from-emerald-400 hover:to-cyan-400 
                          disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Sending...
                                    </span>
                                ) : (
                                    '🚀 Start Scan'
                                )}
                            </button>
                        </div>

                        {/* Demo Access */}
                        <div className="mt-4 pt-4 border-t border-white/20 text-center">
                            <p className="text-xs text-cyan-200 mb-2">Or try instant demo:</p>
                            <div className="flex gap-2 justify-center">
                                <button
                                    type="button"
                                    onClick={handleDemoFairfax}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30 transition"
                                >
                                    🗽 Fairfax
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDemoBerlin}
                                    className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-medium hover:bg-blue-500/30 transition"
                                >
                                    🥨 Berlin
                                </button>
                            </div>
                        </div>

                        {message && (
                            <p className={`mt-4 text-sm ${message.type === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>
                                {message.text}
                            </p>
                        )}
                    </div>
                </form>

                {/* Pitch Line */}
                <p className="mt-8 text-cyan-200/70 text-sm italic">
                    "IKEA Kitchen Planner for flood fixes"
                </p>
            </div>

            {/* Footer */}
            <footer className="py-4 text-center text-cyan-200/50 text-xs">
                Berlin Climate Innovation Center • 2026
            </footer>
        </div>
    );
}
