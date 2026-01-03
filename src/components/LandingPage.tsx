import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LandingPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (user) {
        navigate('/scanner');
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-cyan-800 to-emerald-700 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
                <HeroHeader />
                <AuthCard />
                <Tagline />
            </div>
            <Footer />
        </div>
    );
}

function HeroHeader() {
    return (
        <>
            <HeroIcon />
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Micro-Catchment <span className="block text-emerald-300">Retrofit Planner</span></h1>
            <p className="text-lg md:text-xl text-cyan-100 mb-8 max-w-md">AR street scanning for flood resilience. <span className="block mt-2 font-medium">Visual concepts in minutes → Grant-ready proposals</span></p>
            <Features />
        </>
    );
}

function HeroIcon() {
    return (
        <div className="mb-8 relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center shadow-2xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center"><span className="text-sm">🌧️</span></div>
        </div>
    );
}

function Features() {
    return (
        <div className="flex flex-wrap justify-center gap-4 mb-10 text-sm">
            <FeatureBadge icon="📱" text="AR Scan Streets" />
            <FeatureBadge icon="🌿" text="Smart Sizing" />
            <FeatureBadge icon="📄" text="PDF Export" />
        </div>
    );
}

function FeatureBadge({ icon, text }: { icon: string; text: string }) {
    return <div className="bg-white/10 backdrop-blur rounded-full px-4 py-2 text-white flex items-center gap-2"><span>{icon}</span> {text}</div>;
}

function AuthCard() {
    const auth = useAuthAction();
    return (
        <form onSubmit={auth.handleSubmit} className="w-full max-w-sm">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl text-left">
                <AuthInput email={auth.email} setEmail={auth.setEmail} />
                <AuthButton loading={auth.isLoading} />
                <DemoSection onDemo={auth.runDemo} />
                <AuthMessage message={auth.message} />
            </div>
        </form>
    );
}

function AuthInput({ email, setEmail }: { email: string; setEmail: (s: string) => void }) {
    return (
        <>
            <label htmlFor="email" className="block text-sm font-medium text-cyan-100 mb-2">Enter your email to start</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@city.berlin.de" required className="w-full px-4 py-3 rounded-xl bg-white/90 text-gray-900 mb-3" />
        </>
    );
}

function AuthButton({ loading }: { loading: boolean }) {
    return <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-400 text-white font-semibold">{loading ? 'Sending...' : '🚀 Start Scan'}</button>;
}

function DemoSection({ onDemo }: { onDemo: (s: string) => void }) {
    return (
        <div className="mt-4 pt-4 border-t border-white/20 text-center">
            <p className="text-xs text-cyan-200 mb-2">Or try instant demo:</p>
            <div className="flex gap-2 justify-center">
                <DemoButton label="🗽 Fairfax" onClick={() => onDemo('fairfax')} />
                <DemoButton label="🥨 Berlin" onClick={() => onDemo('berlin')} />
            </div>
        </div>
    );
}

function AuthMessage({ message }: { message: { type: 'success' | 'error'; text: string } | null }) {
    if (!message) return null;
    const cls = message.type === 'error' ? 'text-red-300' : 'text-emerald-300';
    return <p className={`mt-4 text-sm ${cls}`}>{message.text}</p>;
}

function useAuthAction() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const { signInWithEmail, signInAsDemo } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);
        const { error } = await signInWithEmail(email);
        setMessage(error ? { type: 'error', text: error.message } : { type: 'success', text: 'Check your email!' });
        setIsLoading(false);
    };

    const runDemo = async (scenario: string) => {
        setIsLoading(true);
        if (signInAsDemo) {
            await signInAsDemo();
            navigate('/scanner', { state: { demoScenario: scenario } });
        }
    };

    return { email, setEmail, isLoading, message, handleSubmit, runDemo };
}

function DemoButton({ label, onClick }: { label: string; onClick: () => void }) {
    return <button type="button" onClick={onClick} className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20 transition">{label}</button>;
}

function Tagline() {
    return <p className="mt-8 text-cyan-200/70 text-sm italic font-medium">"Digital infrastructure for Sponge Cities"</p>;
}

function Footer() {
    return <footer className="py-4 text-center text-cyan-200/50 text-xs font-medium">Berlin Climate Innovation Center • 2026</footer>;
}
