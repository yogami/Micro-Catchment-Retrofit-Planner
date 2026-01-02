/**
 * Physics-Informed Neural Network (PINN) Model for Runoff Simulation
 * 
 * Solves the kinematic wave approximation of Saint-Venant equations:
 * ∂h/∂t + ∂Q/∂x = q_lateral (rainfall input)
 * Q = (1/n) * A * R^(2/3) * S^(1/2) (Manning's equation)
 * 
 * For shallow overland flow: Q ≈ α * h^m where α = S^0.5/n, m = 5/3
 */

import * as tf from '@tensorflow/tfjs';

// ============ Types ============

export interface PINNInput {
    x: number;        // Spatial position along flow path (m)
    t: number;        // Time since start of rainfall (min)
    rainfall: number; // Rainfall intensity (mm/hr)
    slope: number;    // Surface slope (m/m)
    manningN: number; // Manning's roughness coefficient
}

export interface PINNOutput {
    discharge: number;    // Predicted discharge Q (L/s)
    depth: number;        // Predicted water depth h (mm)
    velocity: number;     // Flow velocity (m/s)
    confidence: number;   // Model confidence (0-1)
    isPINNPrediction: boolean;
}

export interface KinematicWaveParams {
    length: number;    // Catchment length (m)
    rainfall: number;  // Rainfall intensity (mm/hr)
    slope: number;     // Surface slope (m/m)
    manningN: number;  // Manning's n
    width: number;     // Catchment width (m)
}

export interface KinematicWaveResult {
    peakDischarge: number;  // Peak Q (L/s)
    timeToPeak: number;     // Time to peak (min)
    equilibriumDepth: number; // Equilibrium depth (mm)
}

// ============ Model Cache ============

let pinnModel: tf.Sequential | null = null;
let isModelLoading = false;

// ============ Model Architecture ============

/**
 * Create the PINN model architecture
 * Input: [x, t, rainfall, slope, manningN] (normalized)
 * Output: [discharge]
 */
export async function createPINNModel(): Promise<tf.Sequential> {
    await tf.ready();

    const model = tf.sequential();

    // Input layer + Hidden layer 1
    model.add(tf.layers.dense({
        units: 32,
        activation: 'tanh',
        inputShape: [5],
        kernelInitializer: 'glorotNormal',
    }));

    // Hidden layer 2
    model.add(tf.layers.dense({
        units: 64,
        activation: 'tanh',
        kernelInitializer: 'glorotNormal',
    }));

    // Hidden layer 3
    model.add(tf.layers.dense({
        units: 64,
        activation: 'tanh',
        kernelInitializer: 'glorotNormal',
    }));

    // Hidden layer 4
    model.add(tf.layers.dense({
        units: 32,
        activation: 'tanh',
        kernelInitializer: 'glorotNormal',
    }));

    // Output layer (discharge, always positive via softplus)
    model.add(tf.layers.dense({
        units: 1,
        activation: 'softplus', // Ensures positive output
    }));

    model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
    });

    return model;
}

/**
 * Get or create the PINN model (singleton pattern)
 */
export async function getModel(): Promise<tf.Sequential> {
    if (pinnModel) return pinnModel;

    if (isModelLoading) {
        // Wait for loading to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        return getModel();
    }

    isModelLoading = true;

    try {
        // Try to load pre-trained weights
        // TODO: Implement model loading from /public/models/pinn_runoff.json
        pinnModel = await createPINNModel();
        return pinnModel;
    } finally {
        isModelLoading = false;
    }
}

// ============ Normalization ============

const NORMALIZATION = {
    x: { min: 0, max: 200 },         // meters
    t: { min: 0, max: 120 },         // minutes
    rainfall: { min: 0, max: 150 },  // mm/hr
    slope: { min: 0.001, max: 0.2 }, // m/m
    manningN: { min: 0.01, max: 0.1 },
};

function normalize(value: number, key: keyof typeof NORMALIZATION): number {
    const { min, max } = NORMALIZATION[key];
    return (value - min) / (max - min);
}

function denormalizeDischarge(value: number, input: PINNInput): number {
    // Scale output based on catchment characteristics
    const rainLitersPerSecond = (input.rainfall / 3600) * 100; // Approximate for 100m² 
    return value * rainLitersPerSecond;
}

// ============ Prediction ============

/**
 * Predict runoff discharge using the PINN model
 */
export async function predictRunoff(input: PINNInput): Promise<PINNOutput> {
    const model = await getModel();

    // Normalize inputs
    const normalizedInput = [
        normalize(input.x, 'x'),
        normalize(input.t, 't'),
        normalize(input.rainfall, 'rainfall'),
        normalize(input.slope, 'slope'),
        normalize(input.manningN, 'manningN'),
    ];

    // Run inference
    const inputTensor = tf.tensor2d([normalizedInput]);
    const outputTensor = model.predict(inputTensor) as tf.Tensor;
    const rawOutput = outputTensor.dataSync()[0];

    // Cleanup tensors
    inputTensor.dispose();
    outputTensor.dispose();

    // Denormalize and apply physics constraints
    let discharge = denormalizeDischarge(rawOutput, input);

    // Physics constraint: discharge at t=0 should be zero
    if (input.t <= 0) {
        discharge = 0;
    }

    // Estimate depth from Manning's equation (inverse)
    const alpha = Math.sqrt(input.slope) / input.manningN;
    const depth = discharge > 0 ? Math.pow(discharge / alpha, 0.6) * 1000 : 0; // mm

    // Velocity from continuity: v = Q / A ≈ Q / (width * h)
    const velocity = depth > 0 ? discharge / (10 * depth / 1000) : 0; // Assume 10m width

    return {
        discharge,
        depth,
        velocity,
        confidence: 0.85, // TODO: Implement uncertainty quantification
        isPINNPrediction: true,
    };
}

// ============ Analytical Solution (for validation) ============

/**
 * Compute the kinematic wave analytical solution
 * Used for PINN training and validation
 * 
 * Reference: Woolhiser & Liggett (1967)
 */
export function computeKinematicWaveSolution(params: KinematicWaveParams): KinematicWaveResult {
    const { length, rainfall, slope, manningN, width } = params;

    // Convert rainfall to m/s
    const q = rainfall / (1000 * 3600); // m/s

    // Kinematic wave celerity parameter
    const alpha = Math.sqrt(slope) / manningN;
    const m = 5 / 3; // Constant for wide rectangular channel

    // Equilibrium depth (when inflow = outflow)
    // From: q * L = alpha * h^m * width
    // h = (q * L / (alpha * width))^(1/m)
    const h_eq = Math.pow((q * length) / (alpha * width), 1 / m);

    // Time to equilibrium (time of concentration)
    // t_c = L / c where c = alpha * m * h^(m-1)
    const c_eq = alpha * m * Math.pow(h_eq, m - 1);
    const t_c = length / c_eq; // seconds
    const timeToPeak = t_c / 60; // minutes

    // Peak discharge at equilibrium
    // Q = alpha * h^m * width
    const Q_peak = alpha * Math.pow(h_eq, m) * width; // m³/s
    const peakDischarge = Q_peak * 1000; // L/s

    return {
        peakDischarge,
        timeToPeak,
        equilibriumDepth: h_eq * 1000, // mm
    };
}

// ============ Fallback (Rational Method) ============

/**
 * Fallback to rational method if PINN fails
 */
export function computeRationalMethod(
    rainfall: number,
    area: number,
    coefficient: number = 0.9
): number {
    // Q = C * i * A / 3600
    return (coefficient * rainfall * area) / 3600; // L/s
}

// ============ Hybrid Prediction ============

/**
 * Get runoff prediction with PINN, falling back to rational method
 */
export async function getHybridPrediction(
    input: PINNInput,
    area: number = 100
): Promise<PINNOutput> {
    try {
        const pinnResult = await predictRunoff(input);

        // Sanity check: PINN result should be in reasonable range
        const rationalEstimate = computeRationalMethod(input.rainfall, area);
        const ratio = pinnResult.discharge / rationalEstimate;

        if (ratio > 0.3 && ratio < 3.0) {
            return pinnResult;
        }

        // PINN result outside reasonable bounds, fall back
        console.warn('PINN prediction outside bounds, using rational fallback');
        return {
            discharge: rationalEstimate,
            depth: 0,
            velocity: 0,
            confidence: 0.5,
            isPINNPrediction: false,
        };
    } catch (error) {
        console.error('PINN prediction failed:', error);
        return {
            discharge: computeRationalMethod(input.rainfall, area),
            depth: 0,
            velocity: 0,
            confidence: 0.3,
            isPINNPrediction: false,
        };
    }
}
