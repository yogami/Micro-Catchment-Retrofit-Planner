/**
 * Synthetic Training Data Generator for PINN
 * 
 * Generates training samples using the kinematic wave analytical solution
 * as ground truth. This is the "data loss" component of PINN training.
 */

import { computeKinematicWaveSolution, type KinematicWaveParams } from './pinnModel';

export interface TrainingSample {
    inputs: number[];  // [x, t, rainfall, slope, manningN]
    output: number;    // discharge Q
}

export interface TrainingDataset {
    samples: TrainingSample[];
    inputMeans: number[];
    inputStds: number[];
    outputMean: number;
    outputStd: number;
}

// Parameter ranges for training data generation
const PARAM_RANGES = {
    length: { min: 50, max: 200, samples: 5 },      // meters
    rainfall: { min: 10, max: 100, samples: 6 },    // mm/hr
    slope: { min: 0.005, max: 0.15, samples: 5 },   // m/m
    manningN: { min: 0.01, max: 0.05, samples: 4 }, // roughness
    width: { min: 5, max: 20, samples: 3 },         // meters
};

// Time discretization
const TIME_STEPS = 10;  // Reduced from 20
const SPACE_STEPS = 5; // Reduced from 10

/**
 * Generate uniform samples within a range
 */
function linspace(min: number, max: number, n: number): number[] {
    const step = (max - min) / (n - 1);
    return Array.from({ length: n }, (_, i) => min + i * step);
}

/**
 * Generate a single training sample at (x, t) for given parameters
 */
function generateSampleAtPoint(
    x: number,
    t: number,
    params: KinematicWaveParams
): TrainingSample {
    const solution = computeKinematicWaveSolution(params);

    // Simplified discharge distribution along space and time
    // At equilibrium (t >= t_peak), Q increases linearly with x
    // Before equilibrium, Q is reduced by time ratio

    const t_ratio = Math.min(t / solution.timeToPeak, 1.0);
    const x_ratio = x / params.length;

    // Rising limb: Q = Q_peak * t_ratio * x_ratio
    // At equilibrium: Q = Q_peak * x_ratio
    let discharge = solution.peakDischarge * t_ratio * x_ratio;

    // Add some noise for regularization
    const noise = (Math.random() - 0.5) * 0.05 * discharge;
    discharge = Math.max(0, discharge + noise);

    return {
        inputs: [
            x,
            t,
            params.rainfall,
            params.slope,
            params.manningN,
        ],
        output: discharge,
    };
}

/**
 * Generate the full synthetic training dataset
 */
export function generateTrainingData(): TrainingDataset {
    const samples: TrainingSample[] = [];

    // Generate parameter combinations
    const lengths = linspace(PARAM_RANGES.length.min, PARAM_RANGES.length.max, PARAM_RANGES.length.samples);
    const rainfalls = linspace(PARAM_RANGES.rainfall.min, PARAM_RANGES.rainfall.max, PARAM_RANGES.rainfall.samples);
    const slopes = linspace(PARAM_RANGES.slope.min, PARAM_RANGES.slope.max, PARAM_RANGES.slope.samples);
    const manningNs = linspace(PARAM_RANGES.manningN.min, PARAM_RANGES.manningN.max, PARAM_RANGES.manningN.samples);
    const widths = linspace(PARAM_RANGES.width.min, PARAM_RANGES.width.max, PARAM_RANGES.width.samples);

    // Iterate through parameter combinations
    for (const length of lengths) {
        for (const rainfall of rainfalls) {
            for (const slope of slopes) {
                for (const manningN of manningNs) {
                    for (const width of widths) {
                        const params: KinematicWaveParams = {
                            length,
                            rainfall,
                            slope,
                            manningN,
                            width,
                        };

                        // Generate samples at each (x, t) point
                        const xPositions = linspace(0, length, SPACE_STEPS);
                        const tPositions = linspace(0, 60, TIME_STEPS);

                        for (const x of xPositions) {
                            for (const t of tPositions) {
                                const sample = generateSampleAtPoint(x, t, params);
                                samples.push(sample);
                            }
                        }
                    }
                }
            }
        }
    }

    // Compute normalization statistics
    const inputMeans = [0, 0, 0, 0, 0];
    const inputStds = [1, 1, 1, 1, 1];
    let outputMean = 0;
    let outputStd = 1;

    if (samples.length > 0) {
        // Compute means
        for (const sample of samples) {
            for (let i = 0; i < 5; i++) {
                inputMeans[i] += sample.inputs[i];
            }
            outputMean += sample.output;
        }
        for (let i = 0; i < 5; i++) {
            inputMeans[i] /= samples.length;
        }
        outputMean /= samples.length;

        // Compute stds
        for (const sample of samples) {
            for (let i = 0; i < 5; i++) {
                inputStds[i] += Math.pow(sample.inputs[i] - inputMeans[i], 2);
            }
            outputStd += Math.pow(sample.output - outputMean, 2);
        }
        for (let i = 0; i < 5; i++) {
            inputStds[i] = Math.sqrt(inputStds[i] / samples.length);
        }
        outputStd = Math.sqrt(outputStd / samples.length);
    }

    console.log(`Generated ${samples.length} training samples`);

    return {
        samples,
        inputMeans,
        inputStds,
        outputMean,
        outputStd,
    };
}

/**
 * Generate boundary condition samples
 * These enforce the physics at domain boundaries
 */
export function generateBoundaryData(): TrainingSample[] {
    const samples: TrainingSample[] = [];

    const rainfalls = [25, 50, 75, 100];
    const slopes = [0.01, 0.05, 0.10];
    const manningNs = [0.01, 0.02, 0.03];

    for (const rainfall of rainfalls) {
        for (const slope of slopes) {
            for (const manningN of manningNs) {
                // Upstream BC: Q(0, t) ≈ 0 (very small catchment area)
                for (let t = 0; t <= 60; t += 5) {
                    samples.push({
                        inputs: [0, t, rainfall, slope, manningN],
                        output: 0.01, // Near-zero discharge at inlet
                    });
                }

                // Initial condition: Q(x, 0) = 0 (dry start)
                for (let x = 0; x <= 100; x += 10) {
                    samples.push({
                        inputs: [x, 0, rainfall, slope, manningN],
                        output: 0,
                    });
                }
            }
        }
    }

    console.log(`Generated ${samples.length} boundary condition samples`);

    return samples;
}

/**
 * Split dataset into train/validation sets
 */
export function splitDataset(
    samples: TrainingSample[],
    trainRatio: number = 0.8
): { train: TrainingSample[]; val: TrainingSample[] } {
    // Shuffle
    const shuffled = [...samples].sort(() => Math.random() - 0.5);

    const splitIndex = Math.floor(shuffled.length * trainRatio);

    return {
        train: shuffled.slice(0, splitIndex),
        val: shuffled.slice(splitIndex),
    };
}
