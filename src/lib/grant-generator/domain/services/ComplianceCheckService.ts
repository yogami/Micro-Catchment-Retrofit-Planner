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
        const checks: ComplianceCheck[] = [];

        for (const req of program.requirements) {
            const check = this.evaluateRequirement(req.id, project, grantId);
            checks.push(check);
        }

        // Add jurisdiction-specific checks
        const jurisdictionChecks = this.getJurisdictionChecks(project);
        checks.push(...jurisdictionChecks);

        // Calculate score
        const requiredChecks = checks.filter(c =>
            program.requirements.find(r => r.id === c.id)?.required
        );
        const passedRequired = requiredChecks.filter(c => c.passed).length;
        const totalRequired = requiredChecks.length || 1;

        const allChecks = checks.filter(c => c.passed).length;
        const totalChecks = checks.length || 1;

        // Score: 70% for required, 30% for optional
        const requiredScore = (passedRequired / totalRequired) * 70;
        const optionalScore = (allChecks / totalChecks) * 30;
        const score = Math.round(requiredScore + optionalScore);

        const eligible = passedRequired === totalRequired;

        // Generate summary
        const summary = this.generateSummary(project, checks);

        return {
            grantProgram: grantId,
            score,
            eligible,
            checks,
            summary
        };
    }

    private evaluateRequirement(
        reqId: string,
        project: ProjectData,
        _grantId: GrantProgramId
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
            hazard_mitigation_plan: this.checkHazardMitigationPlan
        };

        const evaluator = evaluators[reqId];
        if (!evaluator) {
            return { id: reqId, label: reqId, passed: false, reason: 'Unknown requirement' };
        }

        return evaluator(project);
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
        const bcrValue = p.bcrValue ?? 0;
        const passed = (p.hasBCR === true) && bcrValue >= 1.0;
        return {
            id: 'bcr',
            label: 'Cost-Benefit Ratio ≥ 1.0',
            passed,
            value: bcrValue,
            threshold: 1.0,
            reason: passed ? `BCR ${bcrValue} exceeds threshold` : 'BCR below 1.0'
        };
    }

    private checkLocalMatch(_p: ProjectData): ComplianceCheck {
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
        return {
            id: 'water_quality',
            label: 'Water Quality Metrics',
            passed: hasWQ,
            value: hasWQ ? 'Provided' : 'Missing',
            reason: hasWQ ? 'Pollutant data enhances application' : 'Add pollutant removal data'
        };
    }

    private checkPollutantRemoval(p: ProjectData): ComplianceCheck {
        const hasData = (p.phosphorusRemoval_lb_yr ?? 0) > 0 || (p.nitrogenRemoval_lb_yr ?? 0) > 0 || p.bmps.length > 0;
        return {
            id: 'pollutant_removal',
            label: 'Measurable Pollutant Reduction',
            passed: hasData,
            value: hasData ? 'Documented' : 'Required',
            reason: 'SLAF prioritizes TN/TP removal'
        };
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
        return {
            id: 'schwammstadt',
            label: 'Schwammstadt Compliance',
            passed,
            value: `${retention}mm retention`,
            threshold: 25,
            reason: passed ? 'Meets Berlin Sponge City' : 'Increase retention to 25mm+'
        };
    }

    private checkDwaA138(p: ProjectData): ComplianceCheck {
        const hasInfiltration = (p.infiltrationRate_mm_hr ?? 0) >= 10 || p.bmps.length > 0;
        return {
            id: 'dwa_a138',
            label: 'DWA-A 138 Infiltration',
            passed: hasInfiltration,
            value: hasInfiltration ? 'Compliant' : 'Required',
            reason: 'German infiltration standards'
        };
    }

    private checkEquity(_p: ProjectData): ComplianceCheck {
        return {
            id: 'equity',
            label: 'Community Equity Score',
            passed: false,
            value: 'Not assessed',
            reason: 'Add EJScreen data for bonus points'
        };
    }

    private checkHazardMitigationPlan(p: ProjectData): ComplianceCheck {
        const passed = p.hasResiliencePlan === true;
        return {
            id: 'hazard_mitigation_plan',
            label: 'Hazard Mitigation Plan',
            passed,
            value: passed ? 'Aligned' : 'Required',
            reason: 'Must align with FEMA-approved HMP'
        };
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
        checks.push({
            id: 'fairfax_pfm',
            label: 'Fairfax PFM Compliance',
            passed: retention >= 1.5,
            value: `${retention}in LID retention`,
            threshold: 1.5,
            reason: retention >= 1.5 ? 'Meets Fairfax 1.5" standard' : 'Increase to 1.5" for PFM compliance'
        });
    }

    private addVirginiaChecks(p: ProjectData, checks: ComplianceCheck[]): void {
        if (!p.jurisdictionCode.startsWith('US-VA')) return;
        const retention = p.retention_in ?? 0;
        checks.push({
            id: 'virginia_deq',
            label: 'Virginia DEQ Standards',
            passed: retention >= 1.2,
            value: `${retention}in retention`,
            threshold: 1.2,
            reason: retention >= 1.2 ? 'Meets VA DEQ 1.2" standard' : 'Minimum 1.2" required'
        });
    }

    private addBerlinChecks(p: ProjectData, checks: ComplianceCheck[]): void {
        if (!p.jurisdictionCode.startsWith('DE-BE')) return;
        const retention = p.retention_mm ?? (p.retention_in ? p.retention_in * 25.4 : 0);
        checks.push({
            id: 'berlin_schwammstadt',
            label: 'Berliner Regenwasseragentur',
            passed: retention >= 30,
            value: `${retention}mm retention`,
            threshold: 30,
            reason: retention >= 30 ? 'Meets Berlin 30mm standard' : 'Increase to 30mm'
        });
    }

    private generateSummary(project: ProjectData, checks: ComplianceCheck[]): string {
        const lines: string[] = [];
        this.addJurisdictionSummary(project, checks, lines);
        this.addTopPassedChecks(checks, lines);
        this.addTopFailedChecks(checks, lines);
        return lines.join('\n').trim();
    }

    private addJurisdictionSummary(p: ProjectData, checks: ComplianceCheck[], lines: string[]): void {
        const isFairfax = p.jurisdictionCode.startsWith('US-VA-059');
        const isBerlin = p.jurisdictionCode.startsWith('DE-BE');

        if (isFairfax) {
            const pfm = checks.find(c => c.id === 'fairfax_pfm');
            if (pfm?.passed) lines.push(`✅ Fairfax PFM: ${pfm.value} ✓`);
        }

        if (isBerlin) {
            const schwamm = checks.find(c => c.id === 'schwammstadt' || c.id === 'berlin_schwammstadt');
            if (schwamm?.passed) lines.push(`✅ Schwammstadt compliant: DWA-A138 infiltration ✓`);
        }
    }

    private addTopPassedChecks(checks: ComplianceCheck[], lines: string[]): void {
        const passed = checks.filter(c => c.passed && !['fairfax_pfm', 'schwammstadt', 'berlin_schwammstadt'].includes(c.id));
        for (const check of passed.slice(0, 3)) {
            lines.push(`✅ ${check.label}: ${check.value} ✓`);
        }
    }

    private addTopFailedChecks(checks: ComplianceCheck[], lines: string[]): void {
        const failed = checks.filter(c => !c.passed);
        for (const check of failed.slice(0, 2)) {
            lines.push(`⚠️ ${check.label}: ${check.reason}`);
        }
    }
}
