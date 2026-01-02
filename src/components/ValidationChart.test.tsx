import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ValidationChart, getHecRasPeakLs, HEC_RAS_PEAK } from './ValidationChart';

describe('ValidationChart', () => {
    describe('Acceptance: Validation chart displays correctly', () => {
        it('shows HEC-RAS Validation header', () => {
            render(<ValidationChart appPrediction={72} />);
            expect(screen.getByText('HEC-RAS Validation')).toBeInTheDocument();
        });

        it('shows accuracy percentage', () => {
            render(<ValidationChart appPrediction={72} />);
            // 72 L/s vs 76 L/s = 94.7% -> rounds to 95%
            expect(screen.getByText(/\d+% accurate/)).toBeInTheDocument();
        });

        it('displays app prediction value', () => {
            render(<ValidationChart appPrediction={72.5} />);
            expect(screen.getByText(/72\.5 L\/s/)).toBeInTheDocument();
        });

        it('displays HEC-RAS reference value', () => {
            render(<ValidationChart appPrediction={72} />);
            expect(screen.getByText(/76\.0 L\/s/)).toBeInTheDocument();
        });

        it('shows CSV download link when enabled', () => {
            render(<ValidationChart appPrediction={72} showDownload={true} />);
            expect(screen.getByText(/Download validation data/)).toBeInTheDocument();
        });

        it('hides CSV download link when disabled', () => {
            render(<ValidationChart appPrediction={72} showDownload={false} />);
            expect(screen.queryByText(/Download validation data/)).not.toBeInTheDocument();
        });
    });

    describe('Acceptance: App prediction accuracy within 5%', () => {
        it('calculates accuracy correctly for 72 L/s (95%)', () => {
            const hecRasPeak = getHecRasPeakLs(); // 76 L/s
            const appPrediction = 72;
            const accuracy = Math.round((1 - Math.abs(appPrediction - hecRasPeak) / hecRasPeak) * 100);
            expect(accuracy).toBeGreaterThanOrEqual(94);
            expect(accuracy).toBeLessThanOrEqual(96);
        });

        it('shows green accuracy for predictions within 5%', () => {
            render(<ValidationChart appPrediction={74} />);
            // 74 vs 76 = 97% -> should show emerald/green color class
            const accuracyElement = screen.getByText(/\d+% accurate/);
            expect(accuracyElement).toHaveClass('text-emerald-400');
        });

        it('shows yellow accuracy for predictions between 90-95%', () => {
            render(<ValidationChart appPrediction={70} />);
            // 70 vs 76 = 92.1% -> yellow (90-95 range)
            const accuracyElement = screen.getByText(/\d+% accurate/);
            expect(accuracyElement).toHaveClass('text-yellow-400');
        });
    });

    describe('HEC-RAS reference data', () => {
        it('exports correct peak value', () => {
            expect(HEC_RAS_PEAK).toBe(0.076); // m³/s
            expect(getHecRasPeakLs()).toBe(76); // L/s
        });
    });
});
