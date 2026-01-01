import { useState, useEffect, useCallback } from 'react';

interface DemoStep {
    id: string;
    title: string;
    description: string;
    target: string; // CSS selector
    position: 'top' | 'bottom' | 'left' | 'right';
}

const DEMO_STEPS: DemoStep[] = [
    {
        id: 'welcome',
        title: 'Welcome to Micro-Catchment Planner! 🌧️',
        description: 'Scan streets with AR to plan flood-resilient green infrastructure. This 1-minute tour shows you how.',
        target: 'body',
        position: 'bottom',
    },
    {
        id: 'scan',
        title: 'Start AR Scan',
        description: 'Point your camera at a street, parking lot, or sidewalk. The app detects impervious surfaces automatically.',
        target: '[data-demo="scan-button"]',
        position: 'top',
    },
    {
        id: 'detection',
        title: 'Surface Detection',
        description: 'Red overlay shows impervious areas. Peak runoff is calculated in real-time using Berlin rainfall data.',
        target: '[data-demo="detection"]',
        position: 'bottom',
    },
    {
        id: 'fixes',
        title: 'Green Infrastructure Fixes',
        description: 'AI suggests rain gardens, permeable pavement, and tree planters sized to your area.',
        target: '[data-demo="fixes"]',
        position: 'top',
    },
    {
        id: 'ar-view',
        title: '3D/AR View',
        description: 'Toggle to 3D view to see models. Tap "View in AR" to place them in your real environment.',
        target: '[data-demo="ar-toggle"]',
        position: 'bottom',
    },
    {
        id: 'save',
        title: 'Save & Share',
        description: 'Save your project, get a shareable URL, and export a grant-ready PDF report.',
        target: '[data-demo="save-button"]',
        position: 'top',
    },
    {
        id: 'complete',
        title: 'You\'re Ready! 🎉',
        description: 'Start scanning streets to create flood resilience proposals. Share with colleagues or apply for grants.',
        target: 'body',
        position: 'bottom',
    },
];

interface DemoOverlayProps {
    onComplete: () => void;
    onSkip: () => void;
}

export function DemoOverlay({ onComplete, onSkip }: DemoOverlayProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    const step = DEMO_STEPS[currentStep];
    const isLastStep = currentStep === DEMO_STEPS.length - 1;
    const progress = ((currentStep + 1) / DEMO_STEPS.length) * 100;

    const handleNext = useCallback(() => {
        if (isLastStep) {
            setIsVisible(false);
            onComplete();
        } else {
            setCurrentStep((prev) => prev + 1);
        }
    }, [isLastStep, onComplete]);

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    const handleSkip = () => {
        setIsVisible(false);
        onSkip();
    };

    // Auto-advance after 8 seconds for unattended demos
    useEffect(() => {
        const timer = setTimeout(() => {
            handleNext();
        }, 8000);
        return () => clearTimeout(timer);
    }, [currentStep, handleNext]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={handleSkip} />

            {/* Demo Card */}
            <div className="absolute bottom-8 left-4 right-4 pointer-events-auto">
                <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md mx-auto">
                    {/* Progress Bar */}
                    <div className="h-1 bg-gray-200 rounded-full mb-4 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Step Content */}
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{step.description}</p>

                    {/* Step Indicator */}
                    <p className="text-xs text-gray-400 mb-4">
                        Step {currentStep + 1} of {DEMO_STEPS.length}
                    </p>

                    {/* Navigation */}
                    <div className="flex gap-2">
                        {currentStep > 0 && (
                            <button
                                onClick={handlePrev}
                                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition"
                        >
                            {isLastStep ? 'Start Scanning!' : 'Next'}
                        </button>
                        <button
                            onClick={handleSkip}
                            className="px-4 py-2 rounded-lg text-gray-500 text-sm hover:text-gray-700 transition"
                        >
                            Skip
                        </button>
                    </div>
                </div>
            </div>

            {/* Timer indicator */}
            <div className="absolute top-4 right-4 pointer-events-auto">
                <div className="bg-black/50 rounded-full px-3 py-1 text-white text-xs backdrop-blur">
                    ⏱️ ~1 min tour
                </div>
            </div>
        </div>
    );
}

// Hook to check if user has seen demo
export function useDemoState() {
    const [showDemo, setShowDemo] = useState(false);

    useEffect(() => {
        const hasSeenDemo = localStorage.getItem('microcatchment_demo_seen');
        if (!hasSeenDemo) {
            setShowDemo(true);
        }
    }, []);

    const completeDemo = () => {
        localStorage.setItem('microcatchment_demo_seen', 'true');
        setShowDemo(false);
    };

    const skipDemo = () => {
        localStorage.setItem('microcatchment_demo_seen', 'true');
        setShowDemo(false);
    };

    const resetDemo = () => {
        localStorage.removeItem('microcatchment_demo_seen');
        setShowDemo(true);
    };

    return { showDemo, completeDemo, skipDemo, resetDemo };
}
