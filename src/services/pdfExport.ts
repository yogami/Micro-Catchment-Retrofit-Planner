import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { GreenFix } from '../utils/hydrology';
import { matchEligibleGrants, type Grant } from './grantMatcher';

export interface PDFExportData {
    streetName: string;
    latitude: number;
    longitude: number;
    rainfall: number;
    totalArea: number;
    totalReduction: number;
    features: GreenFix[];
    peakRunoff: number;
    screenshotElement?: HTMLElement | null;
}

// Feature type display names
const FEATURE_NAMES: Record<GreenFix['type'], string> = {
    rain_garden: 'Rain Garden',
    permeable_pavement: 'Permeable Pavement',
    tree_planter: 'Tree Planter',
};

// Estimated costs per m² (Berlin market rates)
const COST_PER_M2: Record<GreenFix['type'], number> = {
    rain_garden: 800,
    permeable_pavement: 120,
    tree_planter: 500,
};

/**
 * Export project data as a grant-ready PDF
 */
export async function exportProjectPDF(data: PDFExportData): Promise<void> {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    let y = 15;
    y = drawPDFHeader(doc, data, y);
    y = await drawARCapture(doc, data, y);
    y = drawHydrologyData(doc, data, y);
    y = drawProposedFeatures(doc, data, y);
    y = drawImpactSummary(doc, data, y);
    drawFundingPrograms(doc, data, y);
    drawPDFFooter(doc);

    const filename = `${data.streetName.replace(/\s+/g, '_')}_retrofit_plan.pdf`;
    doc.save(filename);
}

function drawPDFHeader(doc: jsPDF, data: PDFExportData, y: number): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(16, 185, 129); // Emerald
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('Micro-Catchment Retrofit Plan', 10, y + 5);

    doc.setFontSize(14);
    doc.text(data.streetName, 10, y + 15);

    doc.setFontSize(10);
    doc.text(`Coordinates: ${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`, 10, y + 22);

    return 45;
}

async function addCaptureToPDF(doc: jsPDF, container: HTMLElement | null, y: number): Promise<void> {
    if (!container) {
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text('[AR screenshot placeholder - capture on device]', 10, y + 50);
        return;
    }
    const canvas = await html2canvas(container);
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', 10, y, 190, 100);
}

async function drawARCapture(doc: jsPDF, data: PDFExportData, y: number): Promise<number> {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Site Analysis (AR Capture)', 10, y);
    const container = data.screenshotElement || document.querySelector('#ar-container');
    try {
        await addCaptureToPDF(doc, container as HTMLElement, y + 5);
    } catch { /* ignore */ }
    return y + 110;
}

function drawHydrologyData(doc: jsPDF, data: PDFExportData, y: number): number {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Hydrology Analysis', 10, y);
    y += 8;

    doc.setFontSize(10);
    doc.text(`• Rainfall Intensity: ${data.rainfall} mm/hr (design storm)`, 15, y);
    y += 6;
    doc.text(`• Impervious Area: ${data.totalArea} m²`, 15, y);
    y += 6;
    doc.text(`• Peak Runoff: ${data.peakRunoff.toFixed(2)} L/s (before intervention)`, 15, y);
    return y + 10;
}

function drawProposedFeatures(doc: jsPDF, data: PDFExportData, y: number): number {
    doc.setFontSize(12);
    doc.text('Proposed Green Infrastructure', 10, y);
    y += 8;

    data.features.forEach((feature, index) => {
        const name = FEATURE_NAMES[feature.type];
        const reduction = Math.round(feature.reductionRate * 100);
        doc.setFontSize(10);
        doc.text(
            `${index + 1}. ${name} (${feature.size}m²) → -${reduction}% runoff | ${feature.placement}`,
            15,
            y
        );
        y += 6;
    });

    return y + 5;
}

function calculateTotalCost(features: GreenFix[]): number {
    return features.reduce((sum, f) => sum + (f.size * COST_PER_M2[f.type]), 0);
}

function drawImpactSummary(doc: jsPDF, data: PDFExportData, y: number): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    const totalCost = calculateTotalCost(data.features);

    doc.setFillColor(236, 253, 245); // Light emerald
    doc.rect(10, y, pageWidth - 20, 25, 'F');

    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.text(`Total Runoff Reduction: ${Math.round(data.totalReduction)}%`, 15, y + 10);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Estimated Budget: €${totalCost.toLocaleString()} | Timeline: 4-6 weeks`, 15, y + 18);

    return y + 35;
}

function drawFundingPrograms(doc: jsPDF, data: PDFExportData, y: number): number {
    doc.setFontSize(12);
    doc.text('Matched Funding Programs', 10, y);
    y += 8;

    const totalCost = calculateTotalCost(data.features);
    const grants = matchEligibleGrants({
        latitude: data.latitude,
        longitude: data.longitude,
        totalCostEUR: totalCost,
        fixes: data.features.map(f => ({ type: f.type, size: f.size })),
        areaM2: data.totalArea,
    });

    if (grants.length === 0) {
        doc.setFontSize(9);
        doc.setTextColor(128, 128, 128);
        doc.text('No matching funding programs found for this location.', 15, y);
        y += 6;
    } else {
        y = drawGrantList(doc, grants, y);
    }

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Expected ROI: €1 avoided flood damage per €1 invested (10-year horizon)', 15, y + 5);
    return y + 15;
}

function drawGrantList(doc: jsPDF, grants: Grant[], y: number): number {
    doc.setFontSize(9);
    grants.slice(0, 4).forEach((grant) => {
        doc.setTextColor(0, 0, 0);
        doc.text(
            `• ${grant.name}: Up to ${grant.maxFundingPercent}% (max €${grant.maxAmountEUR.toLocaleString()})`,
            15,
            y
        );
        y += 5;
        if (grant.url) {
            doc.setTextColor(59, 130, 246);
            doc.text(`  → ${grant.url}`, 15, y);
            y += 5;
        }
    });
    return y;
}

function drawPDFFooter(doc: jsPDF): void {
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
        `Generated by Micro-Catchment Retrofit Planner | ${new Date().toLocaleDateString()}`,
        10,
        285
    );
}

