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

    it('generates PDF with street name in header', async () => {
        await exportProjectPDF(mockProject);

        expect(mockText).toHaveBeenCalledWith(
            expect.stringContaining('Kreuzberg Flood Fix'),
            expect.any(Number),
            expect.any(Number)
        );
    });

    it('includes rainfall intensity', async () => {
        await exportProjectPDF(mockProject);

        expect(mockText).toHaveBeenCalledWith(
            expect.stringContaining('50'),
            expect.any(Number),
            expect.any(Number)
        );
    });

    it('includes all 3 feature types', async () => {
        await exportProjectPDF(mockProject);

        // Check that features are included
        const textCalls = mockText.mock.calls.map(c => c[0]).join(' ');
        expect(textCalls).toContain('Rain Garden');
        expect(textCalls).toContain('Permeable Pavement');
        expect(textCalls).toContain('Tree Planter');
    });

    it('shows >30% reduction claim', async () => {
        await exportProjectPDF(mockProject);

        const textCalls = mockText.mock.calls.map(c => c[0]).join(' ');
        expect(textCalls).toContain('35%');
    });

    it('includes AR screenshot image', async () => {
        await exportProjectPDF(mockProject);

        expect(mockAddImage).toHaveBeenCalledWith(
            expect.stringContaining('data:image/png'),
            'PNG',
            expect.any(Number),
            expect.any(Number),
            expect.any(Number),
            expect.any(Number)
        );
    });

    it('includes grant eligibility text', async () => {
        await exportProjectPDF(mockProject);

        const textCalls = mockText.mock.calls.map(c => c[0]).join(' ');
        expect(textCalls.toLowerCase()).toContain('grant');
    });

    it('saves PDF with street name in filename', async () => {
        await exportProjectPDF(mockProject);

        expect(mockSave).toHaveBeenCalledWith(
            expect.stringContaining('Kreuzberg_Flood_Fix')
        );
    });

    it('includes coordinates', async () => {
        await exportProjectPDF(mockProject);

        const textCalls = mockText.mock.calls.map(c => c[0]).join(' ');
        expect(textCalls).toContain('52.52');
        expect(textCalls).toContain('13.405');
    });
});
