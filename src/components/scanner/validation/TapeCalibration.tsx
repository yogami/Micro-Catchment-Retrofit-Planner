/**
 * TapeCalibration - Modal component for tape-measure calibration.
 * 
 * Allows user to enter measured distance and see correction factor.
 * 
 * CC ≤ 3, Method length ≤ 30 lines.
 */

import { useState } from 'react';
import { useScaleCalibration } from '../../../hooks/scanner/useScaleCalibration';

interface TapeCalibrationProps {
    calculatedDistance: number;
    onCalibrate: (correctionFactor: number) => void;
    onCancel: () => void;
}

export function TapeCalibration({
    calculatedDistance,
    onCalibrate,
    onCancel
}: TapeCalibrationProps) {
    const [measured, setMeasured] = useState<string>('');
    const parsedMeasured = measured ? parseFloat(measured) : null;
    const calibration = useScaleCalibration(calculatedDistance, parsedMeasured);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (calibration.isCalibrated) {
            onCalibrate(calibration.correctionFactor);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            data-testid="tape-calibration-modal"
        >
            <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full mx-4 border border-white/10 shadow-2xl">
                <h2 className="text-lg font-bold text-white mb-4">📏 Tape Measure Calibration</h2>

                <p className="text-sm text-gray-400 mb-4">
                    Measure one edge of your scan area with a tape measure and enter the distance below.
                </p>

                <div className="bg-gray-800 rounded-lg p-3 mb-4">
                    <div className="text-xs text-gray-500 mb-1">Calculated Distance</div>
                    <div className="text-xl font-mono text-white">
                        {calculatedDistance.toFixed(2)} m
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <label className="block text-sm text-gray-400 mb-2">
                        Measured Distance (meters)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={measured}
                        onChange={e => setMeasured(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="e.g., 10.35"
                        data-testid="measured-input"
                        autoFocus
                    />

                    {calibration.isCalibrated && (
                        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Correction Factor</span>
                                <span className="text-white font-mono">
                                    {calibration.correctionFactor.toFixed(3)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                                <span className="text-gray-400">Accuracy</span>
                                <span className={`font-mono ${calibration.accuracy < 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    ±{calibration.accuracy.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 px-4 py-3 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!calibration.isCalibrated}
                            className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors"
                            data-testid="calibrate-button"
                        >
                            Calibrate
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
