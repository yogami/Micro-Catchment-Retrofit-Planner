import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ValidationChart } from './ValidationChart';
import { getHecRasPeakLs, HEC_RAS_PEAK } from '../utils/hecRasConstants';

describe('ValidationChart', () => {
    describe('Rendering checks', () => {
        it('shows basic UI elements', () => {
            render(<ValidationChart appPrediction={72} />);
            expect(screen.getByText('HEC-RAS Validation')).toBeInTheDocument();
            expect(screen.getByText(/\d+% accurate/)).toBeInTheDocument();
            expect(screen.getByText(/72\.0 L\/s/)).toBeInTheDocument();
            expect(screen.getByText(/76\.0 L\/s/)).toBeInTheDocument();
        });

        it('toggles download link', () => {
            const { rerender } = render(<ValidationChart appPrediction={72} showDownload={true} />);
            expect(screen.getByText(/Download validation data/)).toBeInTheDocument();
            rerender(<ValidationChart appPrediction={72} showDownload={false} />);
            expect(screen.queryByText(/Download validation data/)).not.toBeInTheDocument();
        });
    });

    describe('Accuracy Calculation', () => {
        it('calculates accuracy correctly', () => {
            const hecRasPeak = getHecRasPeakLs();
            const accuracy = Math.round((1 - Math.abs(72 - hecRasPeak) / hecRasPeak) * 100);
            expect(accuracy).toBeGreaterThanOrEqual(94);
            expect(accuracy).toBeLessThanOrEqual(96);
        });

        it('shows correct color based on accuracy', () => {
            const { rerender } = render(<ValidationChart appPrediction={74} />);
            expect(screen.getByText(/\d+% accurate/)).toHaveClass('text-emerald-400');
            rerender(<ValidationChart appPrediction={70} />);
            expect(screen.getByText(/\d+% accurate/)).toHaveClass('text-yellow-400');
        });
    });

    describe('Reference constants', () => {
        it('exports correct peak value', () => {
            expect(HEC_RAS_PEAK).toBe(0.076);
            expect(getHecRasPeakLs()).toBe(76);
        });
    });
});
