import { useState } from 'react';

export function useDemoState() {
    const [showDemo, setShowDemo] = useState(() => {
        if (typeof window === 'undefined') return false;
        return !localStorage.getItem('microcatchment_demo_seen');
    });

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
