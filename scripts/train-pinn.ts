/**
 * PINN Offline Training Script
 * 
 * This script trains the PINN model on synthetic data and saves the weights/model
 * to the public directory for browser inference.
 */

import * as tf from '@tensorflow/tfjs';
// Import tfjs-node to register file:// IO handler, but we'll force CPU backend for stability
import '@tensorflow/tfjs-node';
import { createPINNModel } from '../src/ml/pinnModel.js';
import { generateTrainingData, splitDataset } from '../src/ml/syntheticData.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BATCH_SIZE = 128;
const EPOCHS = 5; // Reduced for quick verification
const LEARNING_RATE = 0.001;
const MODEL_SAVE_PATH = `file://${path.join(__dirname, '../public/models/pinn_runoff')}`;

// Helper: Normalize inputs based on MinMax
const NORMALIZATION = {
    x: { min: 0, max: 200 },
    t: { min: 0, max: 120 },
    rainfall: { min: 0, max: 150 },
    slope: { min: 0.001, max: 0.2 },
    manningN: { min: 0.01, max: 0.1 },
};

function normalizeInput(inputs: number[]): number[] {
    return [
        (inputs[0] - NORMALIZATION.x.min) / (NORMALIZATION.x.max - NORMALIZATION.x.min),
        (inputs[1] - NORMALIZATION.t.min) / (NORMALIZATION.t.max - NORMALIZATION.t.min),
        (inputs[2] - NORMALIZATION.rainfall.min) / (NORMALIZATION.rainfall.max - NORMALIZATION.rainfall.min),
        (inputs[3] - NORMALIZATION.slope.min) / (NORMALIZATION.slope.max - NORMALIZATION.slope.min),
        (inputs[4] - NORMALIZATION.manningN.min) / (NORMALIZATION.manningN.max - NORMALIZATION.manningN.min),
    ];
}

function normalizeOutput(output: number): number {
    const MAX_Q = 200;
    return output / MAX_Q;
}

async function train() {
    console.log('--- PINN Training Started ---');

    // Force CPU backend to avoid native binding issues
    await tf.setBackend('cpu');
    console.log(`Using backend: ${tf.getBackend()}`);

    // 1. Create Model
    const model = await createPINNModel();
    model.compile({
        optimizer: tf.train.adam(LEARNING_RATE),
        loss: 'meanSquaredError',
        metrics: ['mse'],
    });

    // 2. Generate Data
    console.log('Generating training data...');
    const dataset = generateTrainingData();
    const { train, val } = splitDataset(dataset.samples, 0.9);

    const trainInputs = tf.tensor2d(train.map(s => normalizeInput(s.inputs)));
    const trainLabels = tf.tensor2d(train.map(s => [normalizeOutput(s.output)]));

    const valInputs = tf.tensor2d(val.map(s => normalizeInput(s.inputs)));
    const valLabels = tf.tensor2d(val.map(s => [normalizeOutput(s.output)]));

    console.log(`Training on ${train.length} samples...`);

    // 3. Train
    await model.fit(trainInputs, trainLabels, {
        batchSize: BATCH_SIZE,
        epochs: EPOCHS,
        validationData: [valInputs, valLabels],
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                if (epoch % 10 === 0) {
                    console.log(`Epoch ${epoch}: loss=${logs?.loss.toFixed(6)}, val_loss=${logs?.val_loss.toFixed(6)}`);
                }
            }
        }
    });

    // 4. Save Model
    console.log(`Saving model to ${MODEL_SAVE_PATH}...`);
    await model.save(MODEL_SAVE_PATH);

    console.log('--- PINN Training Complete ---');
}

train().catch(err => {
    console.error('Training failed:', err);
    process.exit(1);
});
