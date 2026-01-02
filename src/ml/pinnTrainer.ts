/**
 * PINN Trainer
 * 
 * Manages the training loop for the neural network.
 * Uses "Physics-Supervised" learning where the model learns to approximate
 * the kinematic wave analytical solution across the parameter space.
 */

import * as tf from '@tensorflow/tfjs';
import { getModel } from './pinnModel';
import { generateTrainingData, splitDataset } from './syntheticData';

// Training Hyperparameters
const BATCH_SIZE = 64;
const EPOCHS = 50;
const LEARNING_RATE = 0.001;

/**
 * State of the current training session
 */
export interface TrainingState {
    epoch: number;
    loss: number;
    valLoss: number;
    isTraining: boolean;
}

type TrainingCallback = (state: TrainingState) => void;

/**
 * Train the PINN model
 */
export async function trainModel(
    onEpochEnd?: TrainingCallback
): Promise<tf.History> {
    const model = await getModel();

    // 1. Generate Data
    console.log('Generating physics-based training data...');
    const dataset = generateTrainingData();
    const { train, val } = splitDataset(dataset.samples, 0.8);

    // 2. Prepare Tensors
    const trainInputs = tf.tensor2d(train.map(s => normalizeInput(s.inputs)));
    const trainLabels = tf.tensor2d(train.map(s => [normalizeOutput(s.output)]));

    const valInputs = tf.tensor2d(val.map(s => normalizeInput(s.inputs)));
    const valLabels = tf.tensor2d(val.map(s => [normalizeOutput(s.output)]));

    console.log(`Training on ${train.length} samples, Validating on ${val.length} samples`);

    // 3. Compile (if not already)
    model.compile({
        optimizer: tf.train.adam(LEARNING_RATE),
        loss: 'meanSquaredError',
        metrics: ['mse'],
    });

    // 4. Train
    const history = await model.fit(trainInputs, trainLabels, {
        batchSize: BATCH_SIZE,
        epochs: EPOCHS,
        validationData: [valInputs, valLabels],
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                if (onEpochEnd && logs) {
                    onEpochEnd({
                        epoch: epoch + 1,
                        loss: logs.loss,
                        valLoss: logs.val_loss,
                        isTraining: true,
                    });
                }
                // console.log(`Epoch ${epoch}: loss=${logs?.loss.toFixed(6)}`);
            }
        }
    });

    // 5. Cleanup
    trainInputs.dispose();
    trainLabels.dispose();
    valInputs.dispose();
    valLabels.dispose();

    // 6. Save Normalization Constants
    // In a real app, we'd save these alongside the model weights
    // For now, we rely on the hardcoded constants in pinnModel.ts
    // TODO: Verify dataset stats align with normalization constants

    return history;
}

// Helper: Normalize inputs based on dataset stats (Z-score normalization)
// Note: pinnModel.ts uses MinMax. We should align them.
// For now, we map back to the MinMax used in pinnModel.ts
const NORMALIZATION = {
    x: { min: 0, max: 200 },
    t: { min: 0, max: 120 },
    rainfall: { min: 0, max: 150 },
    slope: { min: 0.001, max: 0.2 },
    manningN: { min: 0.01, max: 0.1 },
};

function normalizeInput(inputs: number[]): number[] {
    // Inputs: [x, t, rainfall, slope, manningN]
    return [
        (inputs[0] - NORMALIZATION.x.min) / (NORMALIZATION.x.max - NORMALIZATION.x.min),
        (inputs[1] - NORMALIZATION.t.min) / (NORMALIZATION.t.max - NORMALIZATION.t.min),
        (inputs[2] - NORMALIZATION.rainfall.min) / (NORMALIZATION.rainfall.max - NORMALIZATION.rainfall.min),
        (inputs[3] - NORMALIZATION.slope.min) / (NORMALIZATION.slope.max - NORMALIZATION.slope.min),
        (inputs[4] - NORMALIZATION.manningN.min) / (NORMALIZATION.manningN.max - NORMALIZATION.manningN.min),
    ];
}

function normalizeOutput(output: number): number {
    // We implicitly denormalize in pinnModel via rain scaling
    // But for training, let's just train on raw Q for simplicity in this MVP iteration?
    // No, Neural Nets needed scaled outputs (0-1 range best).
    // Let's divide by a realistic max Q.
    const MAX_Q = 200; // L/s (very high for typical micro-catchment)
    return output / MAX_Q;
}
