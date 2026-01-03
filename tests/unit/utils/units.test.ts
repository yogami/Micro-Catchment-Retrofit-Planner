import { describe, it, expect } from '@jest/globals';
import {
    convertArea,
    convertRainfall,
    convertFlow,
    convertDepth,
    convertVolume,
    getAreaUnit,
    getRainUnit,
    getFlowUnit,
    getDepthUnit,
    getVolumeUnit
} from '../../../src/utils/units';

describe('Unit Conversion Utilities', () => {
    describe('convertArea', () => {
        it('converts m² to sq ft for imperial', () => {
            expect(convertArea(1, 'imperial')).toBeCloseTo(10.7639, 3);
        });

        it('returns original value for metric', () => {
            expect(convertArea(100, 'metric')).toBe(100);
        });
    });

    describe('convertRainfall', () => {
        it('converts mm to inches for imperial', () => {
            expect(convertRainfall(25.4, 'imperial')).toBeCloseTo(1, 2);
        });

        it('returns original value for metric', () => {
            expect(convertRainfall(50, 'metric')).toBe(50);
        });
    });

    describe('convertFlow', () => {
        it('converts L/s to cfs for imperial', () => {
            expect(convertFlow(28.3, 'imperial')).toBeCloseTo(1, 1);
        });

        it('returns original value for metric', () => {
            expect(convertFlow(100, 'metric')).toBe(100);
        });
    });

    describe('convertDepth', () => {
        it('converts mm to inches for imperial', () => {
            expect(convertDepth(25.4, 'imperial')).toBeCloseTo(1, 2);
        });

        it('returns original value for metric', () => {
            expect(convertDepth(10, 'metric')).toBe(10);
        });
    });

    describe('convertVolume', () => {
        it('converts L to gallons for imperial', () => {
            expect(convertVolume(3.785, 'imperial')).toBeCloseTo(1, 1);
        });

        it('returns original value for metric', () => {
            expect(convertVolume(1000, 'metric')).toBe(1000);
        });
    });

    describe('unit labels', () => {
        it('getAreaUnit returns correct labels', () => {
            expect(getAreaUnit('imperial')).toBe('sq ft');
            expect(getAreaUnit('metric')).toBe('m²');
        });

        it('getRainUnit returns correct labels', () => {
            expect(getRainUnit('imperial')).toBe('in/hr');
            expect(getRainUnit('metric')).toBe('mm/hr');
        });

        it('getFlowUnit returns correct labels', () => {
            expect(getFlowUnit('imperial')).toBe('cfs');
            expect(getFlowUnit('metric')).toBe('L/s');
        });

        it('getDepthUnit returns correct labels', () => {
            expect(getDepthUnit('imperial')).toBe('in');
            expect(getDepthUnit('metric')).toBe('mm');
        });

        it('getVolumeUnit returns correct labels', () => {
            expect(getVolumeUnit('imperial')).toBe('gal');
            expect(getVolumeUnit('metric')).toBe('L');
        });
    });
});
