import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GrantPDFService } from '../../../src/lib/grant-generator/domain/services/GrantPDFService';
import type { GrantApplicationData, GeneratedPDF } from '../../../src/lib/grant-generator/domain/services/GrantPDFService';

// Define mocks
const mockSave = jest.fn();
const mockText = jest.fn();
const mockSetFont = jest.fn();
const mockSetFontSize = jest.fn();
const mockAddPage = jest.fn();
const mockOutput = jest.fn();
const mockLine = jest.fn();
const mockSetTextColor = jest.fn();

jest.mock('jspdf', () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
            save: mockSave,
            text: mockText,
            setFont: mockSetFont,
            setFontSize: mockSetFontSize,
            addPage: mockAddPage,
            output: mockOutput,
            line: mockLine,
            setTextColor: mockSetTextColor,
            internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } }
        }))
    };
});

describe('GrantPDFService', () => {
    let service: GrantPDFService;

    beforeEach(() => {
        service = new GrantPDFService();
        jest.clearAllMocks();
        mockOutput.mockReturnValue(new Blob());
    });

    const mockData: GrantApplicationData = {
        project: {
            name: 'Test Project',
            area_m2: 100,
            retention_in: 0.5,
            retention_mm: 12.7,
            peakReduction_percent: 20,
            bcrValue: 1.2
        },
        geo: {
            jurisdictionCode: 'US-VA',
            hierarchy: ['Virginia'],
            watershed: 'Test Watershed'
        },
        pollutants: {
            TP: 0.5,
            TN: 2.0,
            sediment: 40
        },
        bmps: [
            { type: 'rain_garden', area_m2: 10 }
        ],
        hasResiliencePlan: true
    };

    it('should generate a PDF object', async () => {
        const result = await service.generate(mockData, 'CFPF');
        expect(result).toBeDefined();
        // Expect format: cfpf_preapplication_<timestamp>.pdf
        expect(result.filename).toMatch(/cfpf_preapplication_\d+\.pdf/);
    });

    it('should call save on download', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fakeDoc: any = { save: jest.fn() };
        const pdf = {
            filename: 'test.pdf',
            doc: fakeDoc,
            blob: new Blob(),
            fields: {}
        } as GeneratedPDF;

        service.download(pdf);
        expect(fakeDoc.save).toHaveBeenCalledWith('test.pdf');
    });
});
