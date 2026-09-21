import { ApproverTier, ApprovalStep } from '../types';

export interface EscalationInfo {
  requiredApprover: ApproverTier;
  tierLabel: string;
  description: string;
  isExpiredLimit: boolean;
  requiresMedicalCert: boolean;
  alertMessage?: string;
  color: string;
}

/**
 * Calculates the required approval tier based on cumulative leaves taken:
 * - 1 to 5 leaves: Warden approval only
 * - 5 to 8 leaves: SWO (Student Welfare Officer) approval
 * - 8 to 10 leaves: HOD / AO approval
 * - > 10 leaves: Limitation expired alert + Mandatory Medical Doc + Principal approval
 */
export function getLeaveEscalationInfo(leavesTaken: number): EscalationInfo {
  if (leavesTaken < 5) {
    return {
      requiredApprover: 'Warden',
      tierLabel: 'Tier 1 • Warden Level',
      description: 'Standard leave tier (1 to 5 leaves). Requires hostel warden verification only.',
      isExpiredLimit: false,
      requiresMedicalCert: false,
      color: '#10B981', // Emerald
    };
  }

  if (leavesTaken < 8) {
    return {
      requiredApprover: 'SWO',
      tierLabel: 'Tier 2 • SWO Level',
      description: 'Elevated leave tier (6 to 8 leaves). Student Welfare Officer approval required.',
      isExpiredLimit: false,
      requiresMedicalCert: false,
      color: '#F59E0B', // Amber
    };
  }

  if (leavesTaken < 10) {
    return {
      requiredApprover: 'HOD/AO',
      tierLabel: 'Tier 3 • HOD / AO Level',
      description: 'Critical leave threshold (9 to 10 leaves). Academic HOD & AO approval required.',
      isExpiredLimit: false,
      requiresMedicalCert: false,
      color: '#EA580C', // Orange
    };
  }

  // 10 or more leaves
  return {
    requiredApprover: 'Principal',
    tierLabel: 'Tier 4 • Principal Executive Level',
    description: 'Leave quota exceeded (> 10 leaves). Direct Principal sanction required.',
    isExpiredLimit: true,
    requiresMedicalCert: true,
    alertMessage:
      '⚠️ Limitation of leave is expired! You have taken 10 or more leaves. Before applying, you must upload a verified medical document for sanction by the Principal.',
    color: '#EF4444', // Red
  };
}

export function buildApprovalSteps(approver: ApproverTier): ApprovalStep[] {
  switch (approver) {
    case 'Warden':
      return [
        { role: 'Warden', status: 'Pending', remarks: 'Awaiting Warden verification' },
      ];
    case 'SWO':
      return [
        { role: 'Warden', status: 'Approved', remarks: 'Forwarded to SWO by Warden' },
        { role: 'SWO', status: 'Pending', remarks: 'Awaiting Student Welfare Officer review' },
      ];
    case 'HOD':
    case 'HOD/AO':
      return [
        { role: 'Warden', status: 'Approved', remarks: 'Forwarded by Warden' },
        { role: 'SWO', status: 'Approved', remarks: 'Cleared by SWO' },
        { role: 'HOD', status: 'Pending', remarks: 'Awaiting HOD academic clearance' },
      ];
    case 'AO':
      return [
        { role: 'AO', status: 'Approved', remarks: 'Executive approval by Administrative Officer' },
      ];
    case 'Chief Warden':
      return [
        { role: 'Chief Warden', status: 'Approved', remarks: 'Approved by Chief Warden' },
      ];
    case 'Principal':
      return [
        { role: 'Warden', status: 'Approved', remarks: 'Forwarded by Warden' },
        { role: 'SWO', status: 'Approved', remarks: 'Forwarded by SWO' },
        { role: 'HOD', status: 'Approved', remarks: 'Cleared by HOD' },
        {
          role: 'Principal',
          status: 'Pending',
          remarks: 'Awaiting Principal sanction (Medical doc attached)',
        },
      ];
    default:
      return [
        { role: 'Warden', status: 'Pending', remarks: 'Awaiting verification' },
      ];
  }
}
