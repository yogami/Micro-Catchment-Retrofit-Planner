/**
 * ComplianceCheckService - Scores projects against grant program requirements
 * 
 * @domain grant-generator
 * @layer domain/services
 */

import { GRANT_PROGRAMS, type GrantProgramId } from '../entities/GrantProgram';
import type { BMPType } from '../../../env-calculator/domain/valueObjects/RemovalRate';

export interface BMPSpec {
    type: BMPType;
    area_m2: number;
}

export interface ProjectData {
    jurisdictionCode: string;
    jurisdictionChain: string[];
    area_m2: number;

    // US Imperial units
    retention_in?: number;
    peakReduction_percent?: number;

    // Metric units (for Berlin, etc.)
    retention_mm?: number;
    infiltrationRate_mm_hr?: number;

    // Cost-Benefit
    hasBCR?: boolean;
    bcrValue?: number;

    // Pollutants
    phosphorusRemoval_lb_yr?: number;
    nitrogenRemoval_lb_yr?: number;

    // Resilience
    hasResiliencePlan?: boolean;

    // BMPs
    bmps: BMPSpec[];
}

export interface ComplianceCheck {
    id: string;
    label: string;
    passed: boolean;
    value?: string | number;
    threshold?: number;
    reason?: string;
}

export interface ComplianceResult {
    grantProgram: GrantProgramId;
    score: number; // 0-100
    eligible: boolean;
    checks: ComplianceCheck[];
    summary: string;
}

export class ComplianceCheckService {
    /**
     * Check project compliance against a specific grant program
     */
    checkCompliance(project: ProjectData, grantId: GrantProgramId): ComplianceResult {
        const program = GRANT_PROGRAMS[grantId];
        const checks = program.requirements.map(req => this.evaluateRequirement(req.id, project));

        // Add jurisdiction-specific checks
        checks.push(...this.getJurisdictionChecks(project));

        const requiredIds = new Set(program.requirements.filter(r => r.required).map(r => r.id));
        const requiredChecks = checks.filter(c => requiredIds.has(c.id));

        const passedRequired = requiredChecks.filter(c => c.passed).length;
        const totalRequired = requiredChecks.length || 1;
        const eligible = passedRequired === totalRequired;

        const score = this.calculateScore(checks, totalRequired, passedRequired);
        const summary = this.generateSummary(project, checks);

        return { grantProgram: grantId, score, eligible, checks, summary };
    }

    private calculateScore(checks: ComplianceCheck[], totalRequired: number, passedRequired: number): number {
        const passedAll = checks.filter(c => c.passed).length;
        const totalAll = checks.length || 1;

        // Score: 70% for required, 30% for optional
        const requiredScore = (passedRequired / totalRequired) * 70;
        const optionalScore = (passedAll / totalAll) * 30;
        return Math.round(requiredScore + optionalScore);
    }

    private evaluateRequirement(
        reqId: string,
        project: ProjectData
    ): ComplianceCheck {
        const evaluators: Record<string, (p: ProjectData) => ComplianceCheck> = {
            resilience_plan: this.checkResiliencePlan,
            bcr: this.checkBCR,
            local_match: this.checkLocalMatch,
            water_quality: this.checkWaterQuality,
            pollutant_removal: this.checkPollutantRemoval,
            chesapeake_watershed: this.checkChesapeakeWatershed,
            schwammstadt: this.checkSchwammstadt,
            dwa_a138: this.checkDwaA138,
            equity: this.checkEquity,
            hazard_mitigation_plan: this.checkResiliencePlan // Alias
        };

        const evaluator = evaluators[reqId];
        return evaluator ? evaluator(project) : { id: reqId, label: reqId, passed: false, reason: 'Unknown' };
    }

    private checkResiliencePlan(p: ProjectData): ComplianceCheck {
        const passed = p.hasResiliencePlan === true;
        return {
            id: 'resilience_plan',
            label: 'FEMA-Approved Resilience Plan',
            passed,
            value: passed ? 'Yes' : 'No',
            reason: passed ? 'Plan approved' : 'Resilience plan required'
        };
    }

    private checkBCR(p: ProjectData): ComplianceCheck {
        const b = p.bcrValue ?? 0;
        const ok = !!p.hasBCR && b >= 1.0;
        return { id: 'bcr', label: 'BCR', passed: ok, value: b };
    }

    private checkLocalMatch(): ComplianceCheck {
        return {
            id: 'local_match',
            label: '25% Local Match',
            passed: true,
            value: '25%',
            reason: 'Local match commitment required'
        };
    }

    private checkWaterQuality(p: ProjectData): ComplianceCheck {
        const hasWQ = (p.phosphorusRemoval_lb_yr ?? 0) > 0 || p.bmps.length > 0;
        return { id: 'water_quality', label: 'WQ', passed: hasWQ };
    }

    private checkPollutantRemoval(p: ProjectData): ComplianceCheck {
        const hasData = (p.phosphorusRemoval_lb_yr ?? 0) > 0 || p.bmps.length > 0;
        return { id: 'pollutant_removal', label: 'Pollutants', passed: hasData };
    }

    private checkChesapeakeWatershed(p: ProjectData): ComplianceCheck {
        const codes = ['US-VA', 'US-MD', 'US-PA'];
        const inChesapeake = codes.some(c => p.jurisdictionCode.startsWith(c));
        return {
            id: 'chesapeake_watershed',
            label: 'Chesapeake Bay Watershed',
            passed: inChesapeake,
            value: inChesapeake ? 'Yes' : 'No',
            reason: 'Priority for Chesapeake projects'
        };
    }

    private checkSchwammstadt(p: ProjectData): ComplianceCheck {
        const retention = p.retention_mm ?? (p.retention_in ? p.retention_in * 25.4 : 0);
        const passed = retention >= 25;
        return { id: 'schwammstadt', label: 'Schwammstadt', passed, value: `${retention}mm`, threshold: 25 };
    }

    private checkDwaA138(p: ProjectData): ComplianceCheck {
        const ok = (p.infiltrationRate_mm_hr ?? 0) >= 10 || p.bmps.length > 0;
        return { id: 'dwa_a138', label: 'DWA-A 138', passed: ok };
    }

    private checkEquity(): ComplianceCheck {
        return { id: 'equity', label: 'Equity', passed: false, reason: 'Pending' };
    }

    private getJurisdictionChecks(project: ProjectData): ComplianceCheck[] {
        const checks: ComplianceCheck[] = [];
        this.addFairfaxChecks(project, checks);
        this.addVirginiaChecks(project, checks);
        this.addBerlinChecks(project, checks);
        return checks;
    }

    private addFairfaxChecks(p: ProjectData, checks: ComplianceCheck[]): void {
        if (!p.jurisdictionCode.startsWith('US-VA-059')) return;
        const retention = p.retention_in ?? 0;
        checks.push({ id: 'fairfax_pfm', label: 'Fairfax PFM', passed: retention >= 1.5, value: `${retention}in`, threshold: 1.5 });
    }

    private addVirginiaChecks(p: ProjectData, checks: ComplianceCheck[]): void {
        if (!p.jurisdictionCode.startsWith('US-VA')) return;
        const retention = p.retention_in ?? 0;
        checks.push({ id: 'virginia_deq', label: 'VA DEQ', passed: retention >= 1.2, value: `${retention}in`, threshold: 1.2 });
    }

    private addBerlinChecks(p: ProjectData, checks: ComplianceCheck[]): void {
        const id = p.jurisdictionCode;
        if (!id.startsWith('DE-BE')) return;
        const r = this.getBerlinRetention(p);
        checks.push({ id: 'berlin_schwammstadt', label: 'Berlin BRW', passed: r >= 30, value: r });
    }

    private getBerlinRetention(p: ProjectData): number {
        return p.retention_mm ?? (p.retention_in ? p.retention_in * 25.4 : 0);
    }

    private generateSummary(project: ProjectData, checks: ComplianceCheck[]): string {
        const lines: string[] = [];
        this.addJurisdictionSummary(project, checks, lines);

        const otherChecked = checks.filter(c => c.passed && !c.id.includes('fairfax') && !c.id.includes('schwamm'));
        otherChecked.slice(0, 2).forEach(c => lines.push(`✅ ${c.label} ✓`));

        checks.filter(c => !c.passed).slice(0, 2).forEach(c => lines.push(`⚠️ ${c.label}`));
        return lines.join('\n').trim();
    }

    private addJurisdictionSummary(p: ProjectData, checks: ComplianceCheck[], lines: string[]): void {
        const id = p.jurisdictionCode;
        this.addFairfaxSummary(id, checks, lines);
        this.addBerlinSummary(id, checks, lines);
    }

    private addFairfaxSummary(id: string, checks: ComplianceCheck[], lines: string[]): void {
        const isFF = id.startsWith('US-VA-059');
        if (isFF) this.pushCheck(checks, 'fairfax_pfm', 'Fairfax PFM', lines);
    }

    private pushCheck(checks: ComplianceCheck[], cid: string, label: string, lines: string[]): void {
        const c = checks.find(x => x.id === cid);
        if (c?.passed) lines.push(`✅ ${label}: ${c.value} ✓`);
    }

    private addBerlinSummary(id: string, checks: ComplianceCheck[], lines: string[]): void {
        const isBE = id.startsWith('DE-BE');
        if (isBE) this.pushBerlin(checks, lines);
    }

    private pushBerlin(checks: ComplianceCheck[], lines: string[]): void {
        const s = checks.find(c => c.id === 'schwammstadt' || c.id === 'berlin_schwammstadt');
        if (s?.passed) lines.push('✅ Schwammstadt: Compliant ✓');
    }

}
