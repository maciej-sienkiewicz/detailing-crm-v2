export interface EmailNotificationRule {
  enabled: boolean;
  subjectTemplate: string;
  bodyTemplate: string;
}

export interface EmailAutomationConfig {
  visitWelcome: EmailNotificationRule;
  visitReadyForPickup: EmailNotificationRule;
  batchOrderClose: EmailNotificationRule;
}

export interface UpdateEmailAutomationConfigRequest {
  visitWelcome: EmailNotificationRule;
  visitReadyForPickup: EmailNotificationRule;
  batchOrderClose: EmailNotificationRule;
}
