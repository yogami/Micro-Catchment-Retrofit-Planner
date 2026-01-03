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
        switch (reqId) {
            case 'resilience_plan':
                return {
                    id: 'resilience_plan',
                    label: 'FEMA-Approved Resilience Plan',
                    passed: project.hasResiliencePlan === true,
                    value: project.hasResiliencePlan ? 'Yes' : 'No',
                    reason: project.hasResiliencePlan ? 'Plan approved' : 'Resilience plan required'
                };

            case 'bcr':
                const bcrPassed = (project.hasBCR === true) && (project.bcrValue ?? 0) >= 1.0;
                return {
                    id: 'bcr',
                    label: 'Cost-Benefit Ratio ≥ 1.0',
                    passed: bcrPassed,
                    value: project.bcrValue ?? 0,
                    threshold: 1.0,
                    reason: bcrPassed ? `BCR ${project.bcrValue} exceeds threshold` : 'BCR below 1.0'
                };

            case 'local_match':
                return {
                    id: 'local_match',
                    label: '25% Local Match',
                    passed: true, // Assuming local match is available
                    value: '25%',
                    reason: 'Local match commitment required'
                };

            case 'water_quality':
                const hasWQ = (project.phosphorusRemoval_lb_yr ?? 0) > 0 || project.bmps.length > 0;
                return {
                    id: 'water_quality',
                    label: 'Water Quality Metrics',
                    passed: hasWQ,
                    value: hasWQ ? 'Provided' : 'Missing',
                    reason: hasWQ ? 'Pollutant data enhances application' : 'Add pollutant removal data'
                };

            case 'pollutant_removal':
                const hasPollutantData = (project.phosphorusRemoval_lb_yr ?? 0) > 0 ||
                    (project.nitrogenRemoval_lb_yr ?? 0) > 0 ||
                    project.bmps.length > 0;
                return {
                    id: 'pollutant_removal',
                    label: 'Measurable Pollutant Reduction',
                    passed: hasPollutantData,
                    value: hasPollutantData ? 'Documented' : 'Required',
                    reason: 'SLAF prioritizes TN/TP removal'
                };

            case 'chesapeake_watershed':
                const inChesapeake = project.jurisdictionCode.startsWith('US-VA') ||
                    project.jurisdictionCode.startsWith('US-MD') ||
                    project.jurisdictionCode.startsWith('US-PA');
                return {
                    id: 'chesapeake_watershed',
                    label: 'Chesapeake Bay Watershed',
                    passed: inChesapeake,
                    value: inChesapeake ? 'Yes' : 'No',
                    reason: 'Priority for Chesapeake projects'
                };

            case 'schwammstadt':
                const retention_mm = project.retention_mm ?? (project.retention_in ? project.retention_in * 25.4 : 0);
                const schwammPassed = retention_mm >= 25; // 25mm minimum for Sponge City
                return {
                    id: 'schwammstadt',
                    label: 'Schwammstadt Compliance',
                    passed: schwammPassed,
                    value: `${retention_mm}mm retention`,
                    threshold: 25,
                    reason: schwammPassed ? 'Meets Berlin Sponge City' : 'Increase retention to 25mm+'
                };

            case 'dwa_a138':
                const hasInfiltration = (project.infiltrationRate_mm_hr ?? 0) >= 10 || project.bmps.length > 0;
                return {
                    id: 'dwa_a138',
                    label: 'DWA-A 138 Infiltration',
                    passed: hasInfiltration,
                    value: hasInfiltration ? 'Compliant' : 'Required',
                    reason: 'German infiltration standards'
                };

            case 'equity':
                return {
                    id: 'equity',
                    label: 'Community Equity Score',
                    passed: false, // Would need census data
                    value: 'Not assessed',
                    reason: 'Add EJScreen data for bonus points'
                };

            case 'hazard_mitigation_plan':
                return {
                    id: 'hazard_mitigation_plan',
                    label: 'Hazard Mitigation Plan',
                    passed: project.hasResiliencePlan === true,
                    value: project.hasResiliencePlan ? 'Aligned' : 'Required',
                    reason: 'Must align with FEMA-approved HMP'
                };

            default:
                return {
                    id: reqId,
                    label: reqId,
                    passed: false,
                    reason: 'Unknown requirement'
                };
        }
    }

    private getJurisdictionChecks(project: ProjectData): ComplianceCheck[] {
        const checks: ComplianceCheck[] = [];

        // Fairfax County specific
        if (project.jurisdictionCode.startsWith('US-VA-059')) {
            const retention = project.retention_in ?? 0;
            checks.push({
                id: 'fairfax_pfm',
                label: 'Fairfax PFM Compliance',
                passed: retention >= 1.5,
                value: `${retention}in LID retention`,
                threshold: 1.5,
                reason: retention >= 1.5 ? 'Meets Fairfax 1.5" standard' : 'Increase to 1.5" for PFM compliance'
            });
        }

        // Virginia state
        if (project.jurisdictionCode.startsWith('US-VA')) {
            const retention = project.retention_in ?? 0;
            checks.push({
                id: 'virginia_deq',
                label: 'Virginia DEQ Standards',
                passed: retention >= 1.2,
                value: `${retention}in retention`,
                threshold: 1.2,
                reason: retention >= 1.2 ? 'Meets VA DEQ 1.2" standard' : 'Minimum 1.2" required'
            });
        }

        // Berlin specific
        if (project.jurisdictionCode.startsWith('DE-BE')) {
            const retention = project.retention_mm ?? (project.retention_in ? project.retention_in * 25.4 : 0);
            checks.push({
                id: 'berlin_schwammstadt',
                label: 'Berliner Regenwasseragentur',
                passed: retention >= 30,
                value: `${retention}mm retention`,
                threshold: 30,
                reason: retention >= 30 ? 'Meets Berlin 30mm standard' : 'Increase to 30mm'
            });
        }

        return checks;
    }

    private generateSummary(project: ProjectData, checks: ComplianceCheck[]): string {
        const passed = checks.filter(c => c.passed);
        const failed = checks.filter(c => !c.passed);

        let summary = '';

        // Add jurisdiction-specific summary
        if (project.jurisdictionCode.startsWith('US-VA-059')) {
            const pfmCheck = checks.find(c => c.id === 'fairfax_pfm');
            if (pfmCheck?.passed) {
                summary += `✅ Fairfax PFM: ${pfmCheck.value} ✓\n`;
            }
        }

        if (project.jurisdictionCode.startsWith('DE-BE')) {
            const schwammCheck = checks.find(c => c.id === 'schwammstadt' || c.id === 'berlin_schwammstadt');
            if (schwammCheck?.passed) {
                summary += `✅ Schwammstadt compliant: DWA-A138 infiltration ✓\n`;
            }
        }

        // Add passed checks
        for (const check of passed.slice(0, 3)) {
            summary += `✅ ${check.label}: ${check.value} ✓\n`;
        }

        // Add failed checks
        for (const check of failed.slice(0, 2)) {
            summary += `⚠️ ${check.label}: ${check.reason}\n`;
        }

        return summary.trim();
    }
}
