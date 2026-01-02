/**
 * GrantPDFService - Generates grant application PDFs using jsPDF
 * 
 * @domain grant-generator
 * @layer domain/services
 */

import jsPDF from 'jspdf';
import { GRANT_TEMPLATES, type GrantTemplate } from '../../templates/grantTemplates';
import { GRANT_PROGRAMS, type GrantProgramId } from '../entities/GrantProgram';
import { ComplianceCheckService, type ProjectData, type ComplianceResult } from './ComplianceCheckService';

export interface GrantApplicationData {
    project: {
        name: string;
        street?: string;
        area_m2: number;
        retention_in?: number;
        retention_mm?: number;
        peakReduction_percent?: number;
        bcrValue?: number;
        infiltrationRate_mm_hr?: number;
    };
    geo: {
        hierarchy: string[];
        jurisdictionCode: string;
        watershed?: string;
    };
    pollutants: {
        TP: number;
        TN: number;
        sediment: number;
    };
    bmps: Array<{ type: string; area_m2: number }>;
    hasResiliencePlan?: boolean;
}

export interface GeneratedPDF {
    blob: Blob;
    filename: string;
    fields: Record<string, string>;
    doc: jsPDF;
}

export class GrantPDFService {
    public complianceService = new ComplianceCheckService();

    /**
     * Generate a grant pre-application PDF
     */
    async generate(data: GrantApplicationData, grantId: GrantProgramId): Promise<GeneratedPDF> {
        const template = GRANT_TEMPLATES[grantId];
        const program = GRANT_PROGRAMS[grantId];

        // Build project data for compliance check
        const projectData: ProjectData = {
            jurisdictionCode: data.geo.jurisdictionCode,
            jurisdictionChain: data.geo.hierarchy,
            area_m2: data.project.area_m2,
            retention_in: data.project.retention_in,
            retention_mm: data.project.retention_mm,
            peakReduction_percent: data.project.peakReduction_percent,
            hasBCR: data.project.bcrValue !== undefined,
            bcrValue: data.project.bcrValue,
            hasResiliencePlan: data.hasResiliencePlan,
            phosphorusRemoval_lb_yr: data.pollutants.TP,
            nitrogenRemoval_lb_yr: data.pollutants.TN,
            infiltrationRate_mm_hr: data.project.infiltrationRate_mm_hr,
            bmps: data.bmps.map(b => ({ type: b.type as any, area_m2: b.area_m2 }))
        };

        // Run compliance check
        const compliance = this.complianceService.checkCompliance(projectData, grantId);

        // Calculate derived values
        const totalCost = data.project.area_m2 * (grantId === 'BENE2' ? 120 : 150);
        const federalShare = totalCost * (program.federalMatch_percent / 100);
        const localMatch = totalCost * (program.localMatch_percent / 100);

        // Build field values
        const fields = this.buildFieldValues(data, template, compliance, {
            totalCost,
            federalShare,
            localMatch
        });

        // Generate PDF
        const pdf = this.createPDF(template, fields, compliance, grantId);
        const blob = pdf.output('blob');
        const filename = `${grantId.toLowerCase()}_preapplication_${Date.now()}.pdf`;

        return { blob, filename, fields, doc: pdf };
    }

    private buildFieldValues(
        data: GrantApplicationData,
        template: GrantTemplate,
        compliance: ComplianceResult,
        calcs: { totalCost: number; federalShare: number; localMatch: number }
    ): Record<string, string> {
        const fields: Record<string, string> = {};
        const currency = template.programId === 'BENE2' ? '€' : '$';

        for (const section of template.sections) {
            for (const field of section.fields) {
                let value = '';

                switch (field.source) {
                    case 'project':
                        value = this.getProjectValue(data.project, field.sourceKey || '');
                        break;
                    case 'geo':
                        if (field.sourceKey === 'hierarchy') {
                            value = data.geo.hierarchy.join(' → ');
                        } else {
                            value = (data.geo as any)[field.sourceKey || ''] || '';
                        }
                        break;
                    case 'calc':
                        value = this.calculateValue(field.calcFn || '', data, calcs, currency);
                        break;
                    case 'compliance':
                        const check = compliance.checks.find(c => c.id === field.sourceKey);
                        value = check ? (check.passed ? '✓ ' + (check.value || 'Compliant') : '✗ ' + check.reason) : 'N/A';
                        break;
                    case 'static':
                        value = field.staticValue || '';
                        break;
                }

                fields[field.id] = value;
            }
        }

        return fields;
    }

    private getProjectValue(project: any, key: string): string {
        const value = project[key];
        if (value === undefined) return 'N/A';

        if (key === 'area_m2') return `${value}m²`;
        if (key === 'retention_in') return `${value}"`;
        if (key === 'retention_mm') return `${value}mm`;
        if (key === 'peakReduction_percent') return `${value}%`;
        if (key === 'bcrValue') return value.toFixed(1);

        return String(value);
    }

    private calculateValue(
        calcFn: string,
        data: GrantApplicationData,
        calcs: { totalCost: number; federalShare: number; localMatch: number },
        currency: string
    ): string {
        const formatCurrency = (n: number) => `${currency}${n.toLocaleString()}`;

        if (calcFn.includes('area * 150') || calcFn.includes('area * 120')) {
            return `${formatCurrency(calcs.totalCost)} (${data.project.area_m2}m² @ ${currency}${calcFn.includes('120') ? '120' : '150'}/m²)`;
        }
        if (calcFn.includes('totalCost * 0.75')) {
            return formatCurrency(calcs.federalShare);
        }
        if (calcFn.includes('totalCost * 0.50')) {
            return formatCurrency(calcs.totalCost * 0.5);
        }
        if (calcFn.includes('totalCost * 0.60')) {
            return formatCurrency(calcs.totalCost * 0.6);
        }
        if (calcFn.includes('totalCost * 0.25') || calcFn.includes('totalCost * 0.40')) {
            return formatCurrency(calcs.localMatch);
        }
        if (calcFn.includes('pollutants.TP')) {
            return `${data.pollutants.TP.toFixed(2)} lb/yr`;
        }
        if (calcFn.includes('pollutants.TN')) {
            return `${data.pollutants.TN.toFixed(1)} lb/yr`;
        }
        if (calcFn.includes('pollutants.sediment')) {
            return `${data.pollutants.sediment}% reduction`;
        }

        return 'N/A';
    }

    private createPDF(
        template: GrantTemplate,
        fields: Record<string, string>,
        compliance: ComplianceResult,
        grantId: GrantProgramId
    ): jsPDF {
        const doc = new jsPDF();
        const program = GRANT_PROGRAMS[grantId];
        let y = 20;

        // Header
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(template.title, 105, y, { align: 'center' });
        y += 10;

        // Program info
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${program.name} | Federal: ${program.federalMatch_percent}% | Local: ${program.localMatch_percent}%`, 105, y, { align: 'center' });
        y += 15;

        // Sections
        for (const section of template.sections) {
            // Section header
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setDrawColor(0, 100, 200);
            doc.line(15, y, 195, y);
            y += 6;
            doc.text(section.title, 15, y);
            y += 8;

            // Fields as table
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            for (const field of section.fields) {
                const value = fields[field.id] || 'N/A';

                // Label
                doc.setFont('helvetica', 'bold');
                doc.text(field.label + ':', 20, y);

                // Value
                doc.setFont('helvetica', 'normal');
                doc.text(value, 80, y);

                y += 6;

                // Page break if needed
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
            }

            y += 5;
        }

        // Compliance Summary
        y += 5;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setDrawColor(0, 150, 0);
        doc.line(15, y, 195, y);
        y += 6;
        doc.text(`Compliance Score: ${compliance.score}% ${compliance.eligible ? '(ELIGIBLE)' : '(NOT ELIGIBLE)'}`, 15, y);
        y += 10;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const summaryLines = compliance.summary.split('\n');
        for (const line of summaryLines) {
            doc.text(line, 20, y);
            y += 5;
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Generated by Microcatchment Planner | ${new Date().toLocaleDateString()}`, 105, 285, { align: 'center' });

        return doc;
    }

    /**
     * Download PDF directly in browser
     */
    download(pdf: GeneratedPDF): void {
        pdf.doc.save(pdf.filename);
    }
}
