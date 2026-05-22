/**
 * Mock records for the prototype Object detail (records list) page.
 *
 * Each entry is a flat row of display values — the prototype renders these in
 * a generic table. Production would source rows from the host app's domain API.
 */

export interface MockRecord {
  id: string;
  name: string;
  status:
    | "Open"
    | "In progress"
    | "Closed"
    | "Approved"
    | "Draft"
    | "In review"
    | "To be approved";
  severity?: "Low" | "Medium" | "High" | "Critical";
  owner: string;
  ownerInitials: string;
}

const RISK_RECORDS: MockRecord[] = [
  { id: "RSK-1042", name: "Third-party data processor non-compliance", status: "In progress", severity: "High", owner: "Jane Doe", ownerInitials: "JD" },
  { id: "RSK-0987", name: "Inadequate access controls on financial systems", status: "Open", severity: "Critical", owner: "Darlene Robertson", ownerInitials: "DR" },
  { id: "RSK-0934", name: "Vendor concentration in payment processing", status: "Approved", severity: "Medium", owner: "Dianne Russell", ownerInitials: "DI" },
  { id: "RSK-0891", name: "Manual reconciliation introduces error risk", status: "Draft", severity: "Low", owner: "Esther Howard", ownerInitials: "EH" },
  { id: "RSK-0825", name: "Cybersecurity incident response gaps", status: "In progress", severity: "High", owner: "Brooklyn Simmons", ownerInitials: "BS" },
  { id: "RSK-0788", name: "Insufficient business continuity testing", status: "In review", severity: "Medium", owner: "Kristin Watson", ownerInitials: "KW" },
  { id: "RSK-0760", name: "Legacy system decommission timeline", status: "To be approved", severity: "Medium", owner: "Dianne Russell", ownerInitials: "DI" },
  { id: "RSK-0741", name: "Regulatory change tracking is decentralized", status: "Closed", severity: "Medium", owner: "Wade Warren", ownerInitials: "WW" },
  { id: "RSK-0712", name: "Key person dependency in treasury operations", status: "Closed", severity: "Low", owner: "Bessie Cooper", ownerInitials: "BC" },
];

const CONTROL_RECORDS: MockRecord[] = [
  { id: "CTL-3019", name: "Quarterly access review for financial systems", status: "Approved", owner: "Jane Doe", ownerInitials: "JD" },
  { id: "CTL-2841", name: "Vendor SOC 2 report annual review", status: "In progress", owner: "Wade Warren", ownerInitials: "WW" },
  { id: "CTL-2655", name: "Multi-factor authentication enforcement", status: "Approved", owner: "Brooklyn Simmons", ownerInitials: "BS" },
  { id: "CTL-2401", name: "Change management approval workflow", status: "Open", owner: "Esther Howard", ownerInitials: "EH" },
];

const PROCESS_RECORDS: MockRecord[] = [
  { id: "PRC-501", name: "Vendor onboarding due diligence", status: "Approved", owner: "Darlene Robertson", ownerInitials: "DR" },
  { id: "PRC-498", name: "Quarterly risk assessment cycle", status: "In progress", owner: "Jane Doe", ownerInitials: "JD" },
  { id: "PRC-487", name: "Incident escalation and reporting", status: "Approved", owner: "Kristin Watson", ownerInitials: "KW" },
];

const OBJECTIVE_RECORDS: MockRecord[] = [
  { id: "OBJ-12", name: "Achieve SOC 2 Type II compliance by Q4", status: "In progress", owner: "Bessie Cooper", ownerInitials: "BC" },
  { id: "OBJ-09", name: "Reduce critical risks by 25% year over year", status: "Open", owner: "Jane Doe", ownerInitials: "JD" },
  { id: "OBJ-07", name: "Increase control automation coverage to 60%", status: "In progress", owner: "Wade Warren", ownerInitials: "WW" },
];

const RISK_EVENT_ASSESSMENT_RECORDS: MockRecord[] = [
  { id: "REA-2204", name: "Cybersecurity incident response drill — Q1", status: "Closed", severity: "High", owner: "Brooklyn Simmons", ownerInitials: "BS" },
  { id: "REA-2185", name: "Third-party data processor — annual review", status: "In progress", severity: "Medium", owner: "Darlene Robertson", ownerInitials: "DR" },
  { id: "REA-2160", name: "Treasury key person risk reassessment", status: "Open", severity: "Low", owner: "Bessie Cooper", ownerInitials: "BC" },
];

const RISK_MITIGATION_PLAN_RECORDS: MockRecord[] = [
  { id: "RMP-318", name: "Implement quarterly access review automation", status: "In progress", owner: "Jane Doe", ownerInitials: "JD" },
  { id: "RMP-301", name: "Roll out MFA across all production systems", status: "Approved", owner: "Brooklyn Simmons", ownerInitials: "BS" },
  { id: "RMP-289", name: "Cross-train treasury operations staff", status: "Draft", owner: "Esther Howard", ownerInitials: "EH" },
];

const CONTROL_ASSESSMENT_RECORDS: MockRecord[] = [
  { id: "CAS-4412", name: "ITGC — change management walkthrough", status: "Approved", severity: "Low", owner: "Dianne Russell", ownerInitials: "DI" },
  { id: "CAS-4398", name: "Vendor SOC review — payment processor", status: "In progress", severity: "Medium", owner: "Jane Doe", ownerInitials: "JD" },
  { id: "CAS-4371", name: "Logical access — quarterly recertification", status: "Open", severity: "High", owner: "Wade Warren", ownerInitials: "WW" },
];

const KEY_RISK_INDICATOR_RECORDS: MockRecord[] = [
  { id: "KRI-004", name: "Failed login attempts (rolling 7 days)", status: "In progress", owner: "Brooklyn Simmons", ownerInitials: "BS" },
  { id: "KRI-003", name: "Critical patch age (days)", status: "Open", owner: "Kristin Watson", ownerInitials: "KW" },
  { id: "KRI-002", name: "Open audit findings over 90 days", status: "Draft", owner: "Bessie Cooper", ownerInitials: "BC" },
];

export const MOCK_RECORDS_BY_OBJECT_TYPE: Record<string, MockRecord[]> = {
  risk: RISK_RECORDS,
  control: CONTROL_RECORDS,
  process: PROCESS_RECORDS,
  objective: OBJECTIVE_RECORDS,
  risk_event_assessment: RISK_EVENT_ASSESSMENT_RECORDS,
  risk_mitigation_plan: RISK_MITIGATION_PLAN_RECORDS,
  control_assessment: CONTROL_ASSESSMENT_RECORDS,
  key_risk_indicator: KEY_RISK_INDICATOR_RECORDS,
};
