import { exportProjectPDF, type PDFExportData } from './pdfExport';

// Mock html2canvas
jest.mock('html2canvas', () => ({
    __esModule: true,
    default: jest.fn().mockResolvedValue({
        toDataURL: () => 'data:image/png;base64,mockImageData',
    }),
}));

// Mock jsPDF
const mockSave = jest.fn();
const mockText = jest.fn();
const mockAddImage = jest.fn();
const mockSetFontSize = jest.fn();
const mockSetTextColor = jest.fn();
const mockSetFillColor = jest.fn();
const mockRect = jest.fn();

jest.mock('jspdf', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
        text: mockText,
        addImage: mockAddImage,
        setFontSize: mockSetFontSize,
        setTextColor: mockSetTextColor,
        setFillColor: mockSetFillColor,
        rect: mockRect,
        save: mockSave,
        internal: {
            pageSize: { getWidth: () => 210, getHeight: () => 297 },
        },
    })),
}));

describe('PDF Export', () => {
    const mockProject: PDFExportData = {
        streetName: 'Kreuzberg Flood Fix',
        latitude: 52.52,
        longitude: 13.405,
        rainfall: 50,
        totalArea: 100,
        totalReduction: 35,
        features: [
            { type: 'rain_garden', size: 20, reductionRate: 0.4, placement: 'Sidewalk edge' },
            { type: 'permeable_pavement', size: 50, reductionRate: 0.7, placement: 'Parking area' },
            { type: 'tree_planter', size: 30, reductionRate: 0.25, placement: 'Road verge' },
        ],
        peakRunoff: 1.25,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = '<div id="ar-container">AR View</div>';
    });

    it('generates PDF with all project details', async () => {
        await exportProjectPDF(mockProject);
        const textCalls = mockText.mock.calls.map(c => c[0].toString());

        expect(textCalls.some(t => t.includes('Kreuzberg Flood Fix'))).toBe(true);
        expect(textCalls.some(t => t.includes('50'))).toBe(true); // rainfall
        expect(textCalls.some(t => t.includes('Rain Garden'))).toBe(true);
        expect(textCalls.some(t => t.includes('Permeable Pavement'))).toBe(true);
        expect(textCalls.some(t => t.includes('35%'))).toBe(true); // reduction
        expect(textCalls.some(t => t.includes('52.52'))).toBe(true); // lat
    });

    it('includes AR screenshot image', async () => {
        await exportProjectPDF(mockProject);
        expect(mockAddImage).toHaveBeenCalledWith(
            expect.stringContaining('data:image/png'), 'PNG',
            expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number)
        );
    });

    it('includes matched funding programs and saves file', async () => {
        await exportProjectPDF(mockProject);
        const textCalls = mockText.mock.calls.map(c => c[0].toString().toLowerCase());

        expect(textCalls.some(t => t.includes('bene2'))).toBe(true);
        expect(mockSave).toHaveBeenCalledWith(expect.stringContaining('Kreuzberg_Flood_Fix'));
    });
});
