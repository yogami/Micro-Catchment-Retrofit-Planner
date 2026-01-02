/**
 * Grant Generator Library
 * 
 * Domain-agnostic library for generating grant pre-applications:
 * - Compliance checking against grant requirements
 * - PDF generation with jsPDF
 * - Template-based field mapping
 * 
 * Supports: CFPF, SLAF, BRIC (USA), BENE2 (Berlin)
 * 
 * @example
 * ```typescript
 * import { GrantPDFService } from '@/lib/grant-generator';
 * 
 * const service = new GrantPDFService();
 * const pdf = await service.generate({
 *   project: { name: 'Fairfax Retrofit', area_m2: 120, ... },
 *   geo: { hierarchy: ['Fairfax County', 'Virginia', 'USA'], ... },
 *   pollutants: { TP: 0.42, TN: 12, sediment: 85 },
 *   bmps: [{ type: 'rain_garden', area_m2: 24 }]
 * }, 'CFPF');
 * 
 * service.download(pdf);
 * ```
 */

// Domain Layer - Entities
export { GRANT_PROGRAMS } from './domain/entities/GrantProgram';
export type { GrantProgram, GrantProgramId, GrantRequirement } from './domain/entities/GrantProgram';

// Domain Layer - Services
export { ComplianceCheckService } from './domain/services/ComplianceCheckService';
export type {
    ProjectData,
    ComplianceCheck,
    ComplianceResult,
    BMPSpec
} from './domain/services/ComplianceCheckService';

export { GrantPDFService } from './domain/services/GrantPDFService';
export type { GrantApplicationData, GeneratedPDF } from './domain/services/GrantPDFService';

// Templates
export { GRANT_TEMPLATES, CFPF_TEMPLATE, SLAF_TEMPLATE, BRIC_TEMPLATE, BENE2_TEMPLATE } from './templates/grantTemplates';
export type { GrantTemplate, TemplateField, TemplateSection } from './templates/grantTemplates';

// ============================================================================
// Factory Functions
// ============================================================================

import { ComplianceCheckService } from './domain/services/ComplianceCheckService';
import { GrantPDFService } from './domain/services/GrantPDFService';

/**
 * Create a compliance check service
 */
export function createComplianceService(): ComplianceCheckService {
    return new ComplianceCheckService();
}

/**
 * Create a grant PDF generation service
 */
export function createGrantPDFService(): GrantPDFService {
    return new GrantPDFService();
}
