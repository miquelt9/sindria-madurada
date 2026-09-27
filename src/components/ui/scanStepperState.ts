export const SCAN_FLOW_STEPS = ['photo', 'knock', 'result'] as const;

export type ScanFlowStep = (typeof SCAN_FLOW_STEPS)[number];

export type ScanStepStatus = 'completed' | 'current' | 'upcoming';

export interface ScanStepperItem {
  step: ScanFlowStep;
  status: ScanStepStatus;
}

export function isScanFlowStep(step: string): step is ScanFlowStep {
  return (SCAN_FLOW_STEPS as readonly string[]).includes(step);
}

/** Display state for the Photo → Knock → Result shell stepper. */
export function scanStepperItems(current: ScanFlowStep): ScanStepperItem[] {
  const currentIndex = SCAN_FLOW_STEPS.indexOf(current);
  return SCAN_FLOW_STEPS.map((step, index) => ({
    step,
    status: index < currentIndex ? 'completed' : index === currentIndex ? 'current' : 'upcoming',
  }));
}
