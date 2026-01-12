/**
 * ValidationBadge - Displays validation status badge.
 * 
 * Shows Survey-Grade ✓, Needs Calibration ⚠, or Incomplete ✗.
 */

import type { ValidationStatus } from '../../../hooks/scanner/useCoverageValidation';

interface ValidationBadgeProps {
    status: ValidationStatus;
    coveragePercent: number;
    accuracy?: number;
}

const STATUS_CONFIG = {
    pass: {
        icon: '✓',
        label: 'Survey-Grade',
        bgClass: 'bg-emerald-500/20 border-emerald-500/40',
        textClass: 'text-emerald-400'
    },
    warning: {
        icon: '⚠',
        label: 'Needs Calibration',
        bgClass: 'bg-amber-500/20 border-amber-500/40',
        textClass: 'text-amber-400'
    },
    fail: {
        icon: '✗',
        label: 'Incomplete',
        bgClass: 'bg-red-500/20 border-red-500/40',
        textClass: 'text-red-400'
    }
};

export function ValidationBadge({ status, coveragePercent, accuracy }: ValidationBadgeProps) {
    const config = STATUS_CONFIG[status];

    return (
        <div
            className={`px-3 py-2 rounded-lg border ${config.bgClass}`}
            data-testid="validation-badge"
            data-status={status}
        >
            <div className="flex items-center gap-2">
                <span className={`text-lg ${config.textClass}`}>{config.icon}</span>
                <span className={`text-sm font-medium ${config.textClass}`}>
                    {config.label}
                </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
                {coveragePercent.toFixed(1)}% coverage
                {accuracy !== undefined && accuracy > 0 && ` · ±${accuracy.toFixed(1)}%`}
            </div>
        </div>
    );
}
