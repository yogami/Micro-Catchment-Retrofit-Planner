import * as tf from '@tensorflow/tfjs';
import { getRobustRunoffPrediction, initPINNEngine } from '../../../src/ml/pinnInference';
import { computePeakRunoff } from '../../../src/utils/hydrology';

describe('PINN Inference Engine', () => {

    beforeAll(async () => {
        // Mock TF.js backend to avoid WebGL issues in test environment
        await tf.setBackend('cpu');
    });

    it('initializes the engine successfully', async () => {
        const success = await initPINNEngine();
        expect(success).toBe(true);
    });

    it('provides a robust prediction that is physically reasonable', async () => {
        const rainfall = 50; // mm/hr
        const area = 100; // m^2

        const prediction = await getRobustRunoffPrediction(rainfall, area);

        // Rational method baseline: ~1.125 L/s
        const rational = computePeakRunoff(rainfall, area, 0.9);

        // Prediction should be within reasonable bounds of rational method
        // (Since we are using fallback or untrained model in test env, it might default to Rational)
        // If it uses the untrained model fallback, it might be 0 or random, 
        // but robustRunoffPrediction has a guard clause to fall back to Rational if it deviates too much.

        expect(prediction).toBeGreaterThan(0);
        expect(Math.abs(prediction - rational)).toBeLessThan(rational * 0.5); // Tight margin since fallback is expected to kick in
    });

    it('handles heavy rainfall scenarios', async () => {
        const rainfall = 100;
        const area = 1000;
        const prediction = await getRobustRunoffPrediction(rainfall, area);
        expect(prediction).toBeGreaterThan(0);
    });
});
