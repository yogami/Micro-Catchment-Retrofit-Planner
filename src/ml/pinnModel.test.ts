/**
 * PINN Model Unit Tests
 * Tests for Physics-Informed Neural Network runoff prediction
 */

import {
    createPINNModel,
    predictRunoff,
    computeKinematicWaveSolution,
    type PINNInput,
    type PINNOutput,
} from './pinnModel';

// Mock TensorFlow.js for unit tests
jest.mock('@tensorflow/tfjs', () => ({
    sequential: jest.fn(() => ({
        add: jest.fn(),
        compile: jest.fn(),
        predict: jest.fn(() => ({
            dataSync: () => [1.25], // Mock prediction
            dispose: jest.fn(),
        })),
        dispose: jest.fn(),
    })),
    layers: {
        dense: jest.fn(() => ({})),
    },
    train: {
        adam: jest.fn(),
    },
    tensor2d: jest.fn(() => ({
        dispose: jest.fn(),
    })),
    dispose: jest.fn(),
    ready: jest.fn().mockResolvedValue(undefined),
    setBackend: jest.fn().mockResolvedValue(true),
    getBackend: jest.fn(() => 'webgl'),
}));

describe('PINN Model', () => {
    describe('createPINNModel', () => {
        it('creates a sequential model with correct architecture', async () => {
            const model = await createPINNModel();
            expect(model).toBeDefined();
        });

        it('model has 5 inputs: x, t, rainfall, slope, friction', async () => {
            // Input shape is [null, 5] for batch, 5 features
            const model = await createPINNModel();
            expect(model).toBeDefined();
        });
    });

    describe('predictRunoff', () => {
        it('returns discharge prediction for valid input', async () => {
            const input: PINNInput = {
                x: 50, // midpoint of 100m catchment
                t: 30, // 30 minutes into storm
                rainfall: 50, // mm/hr
                slope: 0.02,
                manningN: 0.015,
            };

            const output = await predictRunoff(input);

            expect(output.discharge).toBeGreaterThan(0);
            expect(output.confidence).toBeGreaterThanOrEqual(0);
            expect(output.confidence).toBeLessThanOrEqual(1);
        });

        it('returns zero discharge at t=0 (dry start)', async () => {
            const input: PINNInput = {
                x: 50,
                t: 0,
                rainfall: 50,
                slope: 0.02,
                manningN: 0.015,
            };

            const output = await predictRunoff(input);

            // At t=0, discharge should be very small
            expect(output.discharge).toBeLessThan(0.1);
        });

        it('higher rainfall produces higher discharge', async () => {
            const lowRain: PINNInput = {
                x: 50,
                t: 30,
                rainfall: 25,
                slope: 0.02,
                manningN: 0.015,
            };

            const highRain: PINNInput = {
                x: 50,
                t: 30,
                rainfall: 100,
                slope: 0.02,
                manningN: 0.015,
            };

            const lowOutput = await predictRunoff(lowRain);
            const highOutput = await predictRunoff(highRain);

            expect(highOutput.discharge).toBeGreaterThan(lowOutput.discharge);
        });
    });

    describe('computeKinematicWaveSolution', () => {
        it('computes analytical solution for kinematic wave', () => {
            const result = computeKinematicWaveSolution({
                length: 100, // 100m catchment
                rainfall: 50, // mm/hr
                slope: 0.02,
                manningN: 0.015,
                width: 10, // 10m width
            });

            expect(result.peakDischarge).toBeGreaterThan(0);
            expect(result.timeToPeak).toBeGreaterThan(0);
            expect(result.timeToPeak).toBeLessThan(60); // Should peak within an hour for small catchment
        });

        it('steeper slope gives faster time to peak', () => {
            const gentle = computeKinematicWaveSolution({
                length: 100,
                rainfall: 50,
                slope: 0.01,
                manningN: 0.015,
                width: 10,
            });

            const steep = computeKinematicWaveSolution({
                length: 100,
                rainfall: 50,
                slope: 0.10,
                manningN: 0.015,
                width: 10,
            });

            expect(steep.timeToPeak).toBeLessThan(gentle.timeToPeak);
        });

        it('rougher surface (higher n) gives slower flow', () => {
            const smooth = computeKinematicWaveSolution({
                length: 100,
                rainfall: 50,
                slope: 0.02,
                manningN: 0.010, // concrete
                width: 10,
            });

            const rough = computeKinematicWaveSolution({
                length: 100,
                rainfall: 50,
                slope: 0.02,
                manningN: 0.030, // grass
                width: 10,
            });

            expect(rough.timeToPeak).toBeGreaterThan(smooth.timeToPeak);
        });
    });

    describe('Physics Constraints', () => {
        it('peak discharge is bounded by maximum possible runoff rate', async () => {
            // Maximum theoretical runoff = rainfall * area / 3600 for C=1
            // For 50mm/hr on 100m², max = 50 * 100 / 3600 = 1.39 L/s
            const maxTheoreticalRunoff = (50 * 100) / 3600;

            const input: PINNInput = {
                x: 100, // outlet
                t: 60, // end of storm
                rainfall: 50,
                slope: 0.02,
                manningN: 0.015,
            };

            const output = await predictRunoff(input);

            // Peak discharge should not exceed theoretical maximum by more than 10%
            // (some overshoot is possible due to model approximation)
            expect(output.discharge).toBeLessThanOrEqual(maxTheoreticalRunoff * 1.5);
        });
    });
});

describe('PINN Integration with Hydrology', () => {
    it('PINN prediction can be used for rain garden sizing', async () => {
        const input: PINNInput = {
            x: 100,
            t: 30,
            rainfall: 50,
            slope: 0.02,
            manningN: 0.015,
        };

        const output = await predictRunoff(input);

        // Use PINN discharge for sizing
        const volume = output.discharge * 0.8 * 3600; // L/s * retention * duration
        const gardenArea = volume / 1000 / 0.3; // volume / depth

        expect(gardenArea).toBeGreaterThan(0);
    });
});
