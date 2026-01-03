import { useState, useEffect, useCallback } from 'react';

interface DemoStep {
    id: string; title: string; description: string; target: string; position: 'top' | 'bottom' | 'left' | 'right';
}

const DEMO_STEPS: DemoStep[] = [
    { id: 'welcome', title: 'Welcome to Micro-Catchment Planner! 🌧️', description: 'Scan streets with AR to plan flood-resilient green infrastructure.', target: 'body', position: 'bottom' },
    { id: 'scan', title: 'Start AR Scan', description: 'Point your camera at a street. The app detects impervious surfaces automatically.', target: '[data-demo="scan-button"]', position: 'top' },
    { id: 'detection', title: 'Surface Detection', description: 'Red overlay shows impervious areas. Peak runoff is calculated in real-time.', target: '[data-demo="detection"]', position: 'bottom' },
    { id: 'fixes', title: 'Green Infrastructure Fixes', description: 'AI suggests rain gardens, permeable pavement, and tree planters.', target: '[data-demo="fixes"]', position: 'top' },
    { id: 'ar-view', title: '3D/AR View', description: 'Toggle to 3D view to see models. Tap "View in AR" to place them.', target: '[data-demo="ar-toggle"]', position: 'bottom' },
    { id: 'save', title: 'Save & Share', description: 'Save your project, get a shareable URL, and export a grant-ready PDF.', target: '[data-demo="save-button"]', position: 'top' },
    { id: 'complete', title: 'You\'re Ready! 🎉', description: 'Start scanning streets to create flood resilience proposals.', target: 'body', position: 'bottom' },
];

export function DemoOverlay({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    const isLastStep = currentStep === DEMO_STEPS.length - 1;
    const progress = ((currentStep + 1) / DEMO_STEPS.length) * 100;

    const handleNext = useCallback(() => {
        if (isLastStep) {
            setIsVisible(false);
            onComplete();
        } else setCurrentStep((prev) => prev + 1);
    }, [isLastStep, onComplete]);

    useEffect(() => {
        const timer = setTimeout(handleNext, 8000);
        return () => clearTimeout(timer);
    }, [currentStep, handleNext]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none">
            <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={() => { setIsVisible(false); onSkip(); }} />
            <div className="absolute bottom-8 left-4 right-4 pointer-events-auto">
                <DemoCard
                    step={DEMO_STEPS[currentStep]}
                    progress={progress}
                    current={currentStep}
                    total={DEMO_STEPS.length}
                    onNext={handleNext}
                    onPrev={() => setCurrentStep(c => Math.max(0, c - 1))}
                    onSkip={() => { setIsVisible(false); onSkip(); }}
                    isLast={isLastStep}
                />
            </div>
            <TimerIndicator />
        </div>
    );
}

interface DemoCardProps {
    step: DemoStep;
    progress: number;
    current: number;
    total: number;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
    isLast: boolean;
}

function DemoCard({ step, progress, current, total, onNext, onPrev, onSkip, isLast }: DemoCardProps) {
    return (
        <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md mx-auto">
            <ProgressBar progress={progress} />
            <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
            <p className="text-gray-600 text-sm mb-4">{step.description}</p>
            <p className="text-xs text-gray-400 mb-4">Step {current + 1} of {total}</p>
            <div className="flex gap-2">
                {current > 0 && <button onClick={onPrev} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition">Back</button>}
                <button onClick={onNext} className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition">{isLast ? 'Start!' : 'Next'}</button>
                <button onClick={onSkip} className="px-4 py-2 rounded-lg text-gray-500 text-sm hover:text-gray-700 transition">Skip</button>
            </div>
        </div>
    );
}

function ProgressBar({ progress }: { progress: number }) {
    return (
        <div className="h-1 bg-gray-200 rounded-full mb-4 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
    );
}

function TimerIndicator() {
    return (
        <div className="absolute top-4 right-4 pointer-events-auto">
            <div className="bg-black/50 rounded-full px-3 py-1 text-white text-xs backdrop-blur">⏱️ ~1 min tour</div>
        </div>
    );
}
