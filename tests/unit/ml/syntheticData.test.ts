/**
 * Synthetic Data Generator Tests
 */
import {
    generateTrainingData,
    generateBoundaryData,
    splitDataset,
    type TrainingSample,
    type TrainingDataset
} from '../../../src/ml/syntheticData';

describe('Synthetic Data Generator', () => {
    describe('generateTrainingData', () => {
        let dataset: TrainingDataset;

        beforeAll(() => {
            // This is slow, so we cache it
            dataset = generateTrainingData();
        });

        it('generates non-empty samples', () => {
            expect(dataset.samples.length).toBeGreaterThan(0);
        });

        it('each sample has 5 inputs', () => {
            dataset.samples.slice(0, 10).forEach(s => {
                expect(s.inputs).toHaveLength(5);
            });
        });

        it('each sample has non-negative output', () => {
            dataset.samples.slice(0, 100).forEach(s => {
                expect(s.output).toBeGreaterThanOrEqual(0);
            });
        });

        it('computes input means array', () => {
            expect(dataset.inputMeans).toHaveLength(5);
            dataset.inputMeans.forEach(m => expect(typeof m).toBe('number'));
        });

        it('computes input stds array', () => {
            expect(dataset.inputStds).toHaveLength(5);
            dataset.inputStds.forEach(s => expect(s).toBeGreaterThanOrEqual(0));
        });

        it('computes output mean', () => {
            expect(typeof dataset.outputMean).toBe('number');
        });

        it('computes output std', () => {
            expect(dataset.outputStd).toBeGreaterThanOrEqual(0);
        });
    });

    describe('generateBoundaryData', () => {
        let boundaryData: TrainingSample[];

        beforeAll(() => {
            boundaryData = generateBoundaryData();
        });

        it('generates non-empty array', () => {
            expect(boundaryData.length).toBeGreaterThan(0);
        });

        it('includes x=0 boundary points', () => {
            const xZero = boundaryData.filter(s => s.inputs[0] === 0);
            expect(xZero.length).toBeGreaterThan(0);
        });

        it('includes t=0 boundary points', () => {
            const tZero = boundaryData.filter(s => s.inputs[1] === 0);
            expect(tZero.length).toBeGreaterThan(0);
        });

        it('t=0 points have near-zero discharge', () => {
            const tZero = boundaryData.filter(s => s.inputs[1] === 0);
            tZero.forEach(s => expect(s.output).toBeCloseTo(0, 1));
        });

        it('x=0 points have small discharge', () => {
            const xZero = boundaryData.filter(s => s.inputs[0] === 0);
            xZero.forEach(s => expect(s.output).toBeLessThanOrEqual(1));
        });
    });

    describe('splitDataset', () => {
        const mockSamples: TrainingSample[] = Array.from({ length: 100 }, (_, i) => ({
            inputs: [i, i, i, i, i],
            output: i
        }));

        it('splits at 80/20 by default', () => {
            const { train, val } = splitDataset(mockSamples);
            expect(train.length).toBe(80);
            expect(val.length).toBe(20);
        });

        it('splits at custom ratio', () => {
            const { train, val } = splitDataset(mockSamples, 0.7);
            expect(train.length).toBe(70);
            expect(val.length).toBe(30);
        });

        it('shuffles the data', () => {
            const { train: t1 } = splitDataset(mockSamples);
            const { train: t2 } = splitDataset(mockSamples);
            // Very unlikely to be identical if shuffled
            const firstFive1 = t1.slice(0, 5).map(s => s.output);
            const firstFive2 = t2.slice(0, 5).map(s => s.output);
            // At least one should be different (probabilistic)
            expect(JSON.stringify(firstFive1)).not.toBe(JSON.stringify(firstFive2));
        });

        it('preserves all samples', () => {
            const { train, val } = splitDataset(mockSamples);
            expect(train.length + val.length).toBe(100);
        });

        it('handles small dataset', () => {
            const small = mockSamples.slice(0, 5);
            const { train, val } = splitDataset(small);
            expect(train.length).toBe(4);
            expect(val.length).toBe(1);
        });
    });
});
