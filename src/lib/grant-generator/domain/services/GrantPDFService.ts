/**
 * GrantPDFService - Generates grant application PDFs using jsPDF
 * 
 * @domain grant-generator
 * @layer domain/services
 */

import jsPDF from 'jspdf';
import { GRANT_TEMPLATES, type GrantTemplate } from '../../templates/grantTemplates';
import { GRANT_PROGRAMS, type GrantProgramId } from '../entities/GrantProgram';
import { ComplianceCheckService, type ProjectData, type ComplianceResult, type ComplianceCheck, type BMPSpec } from './ComplianceCheckService';

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
            bmps: data.bmps as BMPSpec[]
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

        const resolvers: Record<string, (f: { sourceKey?: string; calcFn?: string; staticValue?: string }) => string> = {
            project: (f) => this.getProjectValue(data.project, f.sourceKey || ''),
            geo: (f) => this.getGeoValue(data.geo, f.sourceKey || ''),
            calc: (f) => this.calculateValue(f.calcFn || '', data, calcs, currency),
            compliance: (f) => this.getComplianceValue(compliance, f.sourceKey || ''),
            static: (f) => f.staticValue || ''
        };

        template.sections.forEach(s => s.fields.forEach(f => {
            fields[f.id] = resolvers[f.source]?.(f) || '';
        }));

        return fields;
    }

    private getGeoValue(geo: GrantApplicationData['geo'], key: string): string {
        if (key === 'hierarchy') return geo.hierarchy.join(' → ');
        const val = (geo as Record<string, unknown>)[key];
        return val ? String(val) : '';
    }

    private getComplianceValue(compliance: ComplianceResult, key: string): string {
        const c = compliance.checks.find(ch => ch.id === key);
        if (!c) return 'N/A';
        return this.formatCheck(c);
    }

    private formatCheck(c: ComplianceCheck): string {
        return c.passed ? this.formatOk(c) : `✗ ${c.reason || 'Failed'}`;
    }

    private formatOk(c: ComplianceCheck): string {
        return `✓ ${c.value || 'Ok'}`;
    }

    private getProjectValue(project: GrantApplicationData['project'], key: string): string {
        const val = (project as Record<string, unknown>)[key];
        if (val === undefined) return 'N/A';
        return this.formatProjectVal(key, val);
    }

    private formatProjectVal(key: string, val: unknown): string {
        const units: Record<string, string> = {
            area_m2: 'm²', retention_in: '"', retention_mm: 'mm', peakReduction_percent: '%'
        };
        const u = units[key];
        if (u) return `${val}${u}`;
        return key === 'bcrValue' ? (val as number).toFixed(1) : String(val);
    }

    private calculateValue(
        calc: string,
        data: GrantApplicationData,
        calcs: { totalCost: number; federalShare: number; localMatch: number },
        currency: string
    ): string {
        if (calc.includes('area *')) return `${currency}${calcs.totalCost.toLocaleString()} (${data.project.area_m2}m²)`;
        return this.calculateShares(calc, calcs, currency, data);
    }

    private calculateShares(
        calc: string,
        calcs: { totalCost: number; federalShare: number; localMatch: number },
        curr: string,
        data: GrantApplicationData
    ): string {
        if (calc.includes('federalShare')) return `${curr}${calcs.federalShare.toLocaleString()}`;
        if (calc.includes('localMatch')) return `${curr}${calcs.localMatch.toLocaleString()}`;
        return this.calculatePollutant(calc, data.pollutants);
    }

    private calculatePollutant(calc: string, p: GrantApplicationData['pollutants']): string {
        if (calc.includes('TP')) return `${p.TP.toFixed(2)} lb/yr`;
        return this.calculateMorePollutants(calc, p);
    }

    private calculateMorePollutants(calc: string, p: GrantApplicationData['pollutants']): string {
        if (calc.includes('TN')) return `${p.TN.toFixed(1)} lb/yr`;
        return this.calculateSediment(calc, p.sediment);
    }

    private calculateSediment(calc: string, sediment: number): string {
        return calc.includes('sediment') ? `${sediment}% reduction` : 'N/A';
    }

    private createPDF(template: GrantTemplate, fields: Record<string, string>, compliance: ComplianceResult, grantId: GrantProgramId): jsPDF {
        const doc = new jsPDF();
        let y = this.drawTemplateHeader(doc, template, GRANT_PROGRAMS[grantId]);
        y = this.drawTemplateSections(doc, template, fields, y);
        this.drawTemplateCompliance(doc, compliance, y);
        this.drawTemplateFooter(doc);
        return doc;
    }

    private drawTemplateHeader(doc: jsPDF, template: GrantTemplate, program: { name: string, federalMatch_percent: number }): number {
        doc.setFontSize(18); doc.setFont('helvetica', 'bold');
        doc.text(template.title, 105, 20, { align: 'center' });
        doc.setFontSize(10); doc.setFont('helvetica', 'normal');
        doc.text(`${program.name} | Fed: ${program.federalMatch_percent}%`, 105, 30, { align: 'center' });
        return 45;
    }

    private drawTemplateSections(doc: jsPDF, template: GrantTemplate, fields: Record<string, string>, startY: number): number {
        let y = startY;
        template.sections.forEach(s => {
            doc.setFontSize(12); doc.setFont('helvetica', 'bold');
            doc.line(15, y, 195, y); y += 6;
            doc.text(s.title, 15, y); y += 8;
            s.fields.forEach(f => {
                doc.setFontSize(10); doc.setFont('helvetica', 'bold');
                doc.text(f.label + ':', 20, y);
                doc.setFont('helvetica', 'normal');
                doc.text(fields[f.id] || 'N/A', 80, y);
                y += 6;
                if (y > 270) { doc.addPage(); y = 20; }
            });
            y += 5;
        });
        return y;
    }

    private drawTemplateCompliance(doc: jsPDF, compliance: ComplianceResult, y: number): void {
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.line(15, y, 195, y); y += 6;
        doc.text(`Score: ${compliance.score}% ${compliance.eligible ? '(ELIGIBLE)' : ''}`, 15, y);
        y += 10;
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        compliance.summary.split('\n').forEach(line => { doc.text(line, 20, y); y += 5; });
    }

    private drawTemplateFooter(doc: jsPDF): void {
        doc.setFontSize(8); doc.setTextColor(128);
        doc.text(`Generated ${new Date().toLocaleDateString()}`, 105, 285, { align: 'center' });
    }

    /**
     * Download PDF directly in browser
     */
    download(pdf: GeneratedPDF): void {
        pdf.doc.save(pdf.filename);
    }
}
