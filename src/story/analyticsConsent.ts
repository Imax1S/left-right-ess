export type AnalyticsChoice = 'allow' | 'deny';

export const analyticsChoiceKey = 'left-right.analytics-consent.v1';

export function readAnalyticsChoice(): AnalyticsChoice | null {
  try {
    const choice = localStorage.getItem(analyticsChoiceKey);
    return choice === 'allow' || choice === 'deny' ? choice : null;
  } catch {
    return null;
  }
}

export function rememberAnalyticsChoice(choice: AnalyticsChoice) {
  try {
    localStorage.setItem(analyticsChoiceKey, choice);
  } catch {
    // The choice still applies in the current tab when storage is unavailable.
  }
}
