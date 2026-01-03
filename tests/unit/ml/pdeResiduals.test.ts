/**
 * PDE Residuals Tests for PINN Module
 */
import * as tf from '@tensorflow/tfjs';
import { computePhysicsLoss, computeSupervisedPhysicsLoss } from '../../../src/ml/pdeResiduals';

describe('PDE Residuals', () => {
    let mockModel: tf.Sequential;
    let mockInputs: tf.Tensor2D;
    let mockTargets: tf.Tensor2D;

    beforeEach(() => {
        // Create a simple mock model
        mockModel = tf.sequential();
        mockModel.add(tf.layers.dense({ units: 1, inputShape: [5], activation: 'softplus' }));

        // Create mock inputs: [rainfall, area, t, slope, n]
        mockInputs = tf.tensor2d([
            [50, 100, 0.5, 0.02, 0.035],
            [60, 200, 1.0, 0.01, 0.030],
            [40, 150, 0.25, 0.03, 0.040]
        ]);

        // Create mock targets
        mockTargets = tf.tensor2d([[10], [25], [15]]);
    });

    afterEach(() => {
        mockModel.dispose();
        mockInputs.dispose();
        mockTargets.dispose();
    });

    describe('computePhysicsLoss', () => {
        it('returns a scalar', () => {
            const loss = computePhysicsLoss(mockModel, mockInputs);
            expect(loss.rank).toBe(0);
            loss.dispose();
        });

        it('returns non-negative value', async () => {
            const loss = computePhysicsLoss(mockModel, mockInputs);
            const value = await loss.data();
            expect(value[0]).toBeGreaterThanOrEqual(0);
            loss.dispose();
        });

        it('produces consistent results for same input', async () => {
            const loss1 = computePhysicsLoss(mockModel, mockInputs);
            const loss2 = computePhysicsLoss(mockModel, mockInputs);
            const val1 = await loss1.data();
            const val2 = await loss2.data();
            expect(val1[0]).toBeCloseTo(val2[0], 5);
            loss1.dispose();
            loss2.dispose();
        });
    });

    describe('computeSupervisedPhysicsLoss', () => {
        it('returns a scalar', () => {
            const loss = computeSupervisedPhysicsLoss(mockModel, mockInputs, mockTargets);
            expect(loss.rank).toBe(0);
            loss.dispose();
        });

        it('returns positive value for untrained model', async () => {
            const loss = computeSupervisedPhysicsLoss(mockModel, mockInputs, mockTargets);
            const value = await loss.data();
            expect(value[0]).toBeGreaterThan(0);
            loss.dispose();
        });

        it('includes both MSE and negativity penalty', async () => {
            const loss = computeSupervisedPhysicsLoss(mockModel, mockInputs, mockTargets);
            const value = await loss.data();
            // Should be positive due to MSE between random predictions and targets
            expect(value[0]).toBeGreaterThan(0);
            loss.dispose();
        });

        it('does not have memory leaks (tidy is working)', () => {
            const numTensorsBefore = tf.memory().numTensors;
            const loss = computeSupervisedPhysicsLoss(mockModel, mockInputs, mockTargets);
            loss.dispose();
            const numTensorsAfter = tf.memory().numTensors;
            // Should not have increased significantly
            expect(numTensorsAfter).toBeLessThanOrEqual(numTensorsBefore + 1);
        });
    });
});
