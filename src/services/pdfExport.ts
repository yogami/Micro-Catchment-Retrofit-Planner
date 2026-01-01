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

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // ========== HEADER ==========
    doc.setFillColor(16, 185, 129); // Emerald
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('Micro-Catchment Retrofit Plan', 10, y + 5);

    doc.setFontSize(14);
    doc.text(data.streetName, 10, y + 15);

    doc.setFontSize(10);
    doc.text(`Coordinates: ${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`, 10, y + 22);

    y = 45;

    // ========== AR SCREENSHOT ==========
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Site Analysis (AR Capture)', 10, y);
    y += 5;

    try {
        const container = data.screenshotElement || document.querySelector('#ar-container');
        if (container) {
            const canvas = await html2canvas(container as HTMLElement);
            const imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 10, y, 190, 100);
            y += 105;
        } else {
            doc.setFontSize(10);
            doc.setTextColor(128, 128, 128);
            doc.text('[AR screenshot placeholder - capture on device]', 10, y + 50);
            y += 105;
        }
    } catch {
        y += 105;
    }

    // ========== RAINFALL DATA ==========
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
    y += 10;

    // ========== PROPOSED FEATURES ==========
    doc.setFontSize(12);
    doc.text('Proposed Green Infrastructure', 10, y);
    y += 8;

    let totalCost = 0;

    data.features.forEach((feature, index) => {
        const name = FEATURE_NAMES[feature.type];
        const reduction = Math.round(feature.reductionRate * 100);
        const cost = feature.size * COST_PER_M2[feature.type];
        totalCost += cost;

        doc.setFontSize(10);
        doc.text(
            `${index + 1}. ${name} (${feature.size}m²) → -${reduction}% runoff | ${feature.placement}`,
            15,
            y
        );
        y += 6;
    });

    y += 5;

    // ========== IMPACT SUMMARY ==========
    doc.setFillColor(236, 253, 245); // Light emerald
    doc.rect(10, y, pageWidth - 20, 25, 'F');

    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.text(`Total Runoff Reduction: ${Math.round(data.totalReduction)}%`, 15, y + 10);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Estimated Budget: €${totalCost.toLocaleString()} | Timeline: 4-6 weeks`, 15, y + 18);

    y += 35;

    // ========== MATCHED FUNDING PROGRAMS ==========
    doc.setFontSize(12);
    doc.text('Matched Funding Programs', 10, y);
    y += 8;

    // Dynamically match grants based on location and project
    const grants: Grant[] = matchEligibleGrants({
        latitude: data.latitude,
        longitude: data.longitude,
        totalCostEUR: totalCost,
        fixes: data.features.map(f => ({ type: f.type, size: f.size })),
        areaM2: data.totalArea,
    });

    doc.setFontSize(9);

    if (grants.length === 0) {
        doc.setTextColor(128, 128, 128);
        doc.text('No matching funding programs found for this location.', 15, y);
        y += 6;
    } else {
        grants.slice(0, 4).forEach((grant) => {
            doc.setTextColor(0, 0, 0);
            doc.text(
                `• ${grant.name}: Up to ${grant.maxFundingPercent}% (max €${grant.maxAmountEUR.toLocaleString()})`,
                15,
                y
            );
            y += 5;
            if (grant.url) {
                doc.setTextColor(59, 130, 246); // Blue
                doc.text(`  → ${grant.url}`, 15, y);
                y += 5;
            }
        });
    }

    y += 5;

    // ROI note
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Expected ROI: €1 avoided flood damage per €1 invested (10-year horizon)', 15, y);

    // ========== FOOTER ==========
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
        `Generated by Micro-Catchment Retrofit Planner | ${new Date().toLocaleDateString()}`,
        10,
        285
    );

    // ========== SAVE ==========
    const filename = `${data.streetName.replace(/\s+/g, '_')}_retrofit_plan.pdf`;
    doc.save(filename);
}

