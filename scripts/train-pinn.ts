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
import { normalize, normalizeOutput } from '../src/ml/pinnConstants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BATCH_SIZE = 128;
const EPOCHS = 5;
const LEARNING_RATE = 0.001;
const MODEL_SAVE_PATH = `file://${path.join(__dirname, '../public/models/pinn_runoff')}`;

function normalizeInputRow(inputs: number[]): number[] {
    return [
        normalize(inputs[0], 'x'),
        normalize(inputs[1], 't'),
        normalize(inputs[2], 'rainfall'),
        normalize(inputs[3], 'slope'),
        normalize(inputs[4], 'manningN'),
    ];
}

async function train() {
    console.log('--- PINN Training Started ---');
    await tf.setBackend('cpu');
    console.log(`Using backend: ${tf.getBackend()}`);

    const model = await createPINNModel();
    model.compile({ optimizer: tf.train.adam(LEARNING_RATE), loss: 'meanSquaredError', metrics: ['mse'] });

    console.log('Generating training data...');
    const dataset = generateTrainingData();
    const { train: trainingSet, val } = splitDataset(dataset.samples, 0.9);

    const trainInputs = tf.tensor2d(trainingSet.map(s => normalizeInputRow(s.inputs)));
    const trainLabels = tf.tensor2d(trainingSet.map(s => [normalizeOutput(s.output)]));

    const valInputs = tf.tensor2d(val.map(s => normalizeInputRow(s.inputs)));
    const valLabels = tf.tensor2d(val.map(s => [normalizeOutput(s.output)]));

    console.log(`Training on ${trainingSet.length} samples...`);

    await model.fit(trainInputs, trainLabels, {
        batchSize: BATCH_SIZE, epochs: EPOCHS, validationData: [valInputs, valLabels], shuffle: true,
        callbacks: { onEpochEnd: (e, l) => { if (e % 10 === 0) console.log(`E ${e}: loss=${l?.loss.toFixed(4)}`); } }
    });

    console.log(`Saving model to ${MODEL_SAVE_PATH}...`);
    await model.save(MODEL_SAVE_PATH);
    console.log('--- PINN Training Complete ---');
}

train().catch(err => {
    console.error('Training failed:', err);
    process.exit(1);
});
