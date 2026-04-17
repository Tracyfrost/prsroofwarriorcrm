/** Keys in `global_settings` for Slack (webhook + toggles). */
export const SLACK_WEBHOOK_URL_KEY = "slack_webhook_url" as const;

export enum SlackNotificationType {
  NewLeadChannel = "new_lead_channel",
  LeadAssignedDm = "lead_assigned_dm",
  JobStatusChangedChannel = "job_status_changed_channel",
  JobAssignedDm = "job_assigned_dm",
  PaymentReceivedChannel = "payment_received_channel",
  LargePaymentAlertDm = "large_payment_alert_dm",
  FollowUpScheduledDm = "follow_up_scheduled_dm",
  OverdueFollowUpDm = "overdue_follow_up_dm",
}

export const SLACK_NOTIFICATION_SETTING_KEY: Record<SlackNotificationType, string> = {
  [SlackNotificationType.NewLeadChannel]: "slack_notify_new_lead_channel",
  [SlackNotificationType.LeadAssignedDm]: "slack_notify_lead_assigned_dm",
  [SlackNotificationType.JobStatusChangedChannel]: "slack_notify_job_status_channel",
  [SlackNotificationType.JobAssignedDm]: "slack_notify_job_assigned_dm",
  [SlackNotificationType.PaymentReceivedChannel]: "slack_notify_payment_received_channel",
  [SlackNotificationType.LargePaymentAlertDm]: "slack_notify_large_payment_dm",
  [SlackNotificationType.FollowUpScheduledDm]: "slack_notify_follow_up_scheduled_dm",
  [SlackNotificationType.OverdueFollowUpDm]: "slack_notify_overdue_follow_up_dm",
};

export const ALL_SLACK_SETTING_KEYS: string[] = [
  SLACK_WEBHOOK_URL_KEY,
  ...Object.values(SLACK_NOTIFICATION_SETTING_KEY),
];

export type SlackNotificationUiMeta = {
  type: SlackNotificationType;
  label: string;
  subtitle: string;
  delivery: "channel" | "dm";
};

/** Ordered rows for the Slack settings tab. */
export const SLACK_NOTIFICATION_UI_ROWS: SlackNotificationUiMeta[] = [
  {
    type: SlackNotificationType.NewLeadChannel,
    label: "New Lead",
    subtitle: "Channel",
    delivery: "channel",
  },
  {
    type: SlackNotificationType.LeadAssignedDm,
    label: "Lead Assigned",
    subtitle: "DM to rep",
    delivery: "dm",
  },
  {
    type: SlackNotificationType.JobStatusChangedChannel,
    label: "Job Status Changed",
    subtitle: "Channel",
    delivery: "channel",
  },
  {
    type: SlackNotificationType.JobAssignedDm,
    label: "Job Assigned",
    subtitle: "DM to PM",
    delivery: "dm",
  },
  {
    type: SlackNotificationType.PaymentReceivedChannel,
    label: "Payment Received",
    subtitle: "Channel",
    delivery: "channel",
  },
  {
    type: SlackNotificationType.LargePaymentAlertDm,
    label: "Large Payment Alert",
    subtitle: "DM to owners",
    delivery: "dm",
  },
  {
    type: SlackNotificationType.FollowUpScheduledDm,
    label: "Follow-up Scheduled",
    subtitle: "DM to rep",
    delivery: "dm",
  },
  {
    type: SlackNotificationType.OverdueFollowUpDm,
    label: "Overdue Follow-up",
    subtitle: "DM to rep + manager",
    delivery: "dm",
  },
];
