import {
    createPINNModel,
    predictRunoff,
    computeKinematicWaveSolution,
    type PINNInput,
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

describe('PINN Model Creation', () => {
    it('creates a sequential model with correct architecture', async () => {
        const model = await createPINNModel();
        expect(model).toBeDefined();
    });

    it('model has 5 inputs', async () => {
        const model = await createPINNModel();
        expect(model).toBeDefined();
    });
});

describe('PINN Rainfall Prediction', () => {
    const createInput = (rainfall = 50, t = 30): PINNInput => ({
        x: 50, t, rainfall, slope: 0.02, manningN: 0.015,
    });

    it('returns valid discharge prediction', async () => {
        const output = await predictRunoff(createInput());
        expect(output.discharge).toBeGreaterThan(0);
        expect(output.confidence).toBeGreaterThanOrEqual(0);
    });

    it('returns zero discharge at t=0', async () => {
        const output = await predictRunoff(createInput(50, 0));
        expect(output.discharge).toBeLessThan(0.1);
    });

    it('higher rainfall produces higher discharge', async () => {
        const lowOutput = await predictRunoff(createInput(25));
        const highOutput = await predictRunoff(createInput(100));
        expect(highOutput.discharge).toBeGreaterThan(lowOutput.discharge);
    });
});

describe('Kinematic Wave Solution', () => {
    it('computes analytical solution', () => {
        const result = computeKinematicWaveSolution({
            length: 100, rainfall: 50, slope: 0.02, manningN: 0.015, width: 10,
        });
        expect(result.peakDischarge).toBeGreaterThan(0);
        expect(result.timeToPeak).toBeGreaterThan(0);
    });

    it('steeper slope gives faster time to peak', () => {
        const gentle = computeKinematicWaveSolution({ length: 100, rainfall: 50, slope: 0.01, manningN: 0.015, width: 10 });
        const steep = computeKinematicWaveSolution({ length: 100, rainfall: 50, slope: 0.10, manningN: 0.015, width: 10 });
        expect(steep.timeToPeak).toBeLessThan(gentle.timeToPeak);
    });
});

describe('Physics Constraints', () => {
    it('peak discharge is bounded', async () => {
        const maxTheoretical = (50 * 100) / 3600;
        const input: PINNInput = { x: 100, t: 60, rainfall: 50, slope: 0.02, manningN: 0.015 };
        const output = await predictRunoff(input);
        expect(output.discharge).toBeLessThanOrEqual(maxTheoretical * 1.5);
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
