-- Slack webhook + per-notification toggles (idempotent seed)
INSERT INTO public.global_settings (key, value, description, category) VALUES
  ('slack_webhook_url', to_jsonb(''::text), 'Incoming Slack webhook URL for channel messages', 'integrations'),
  ('slack_notify_new_lead_channel', 'true'::jsonb, 'Post new lead notifications to Slack channel', 'notifications'),
  ('slack_notify_lead_assigned_dm', 'true'::jsonb, 'DM assigned rep when a lead is assigned', 'notifications'),
  ('slack_notify_job_status_channel', 'true'::jsonb, 'Post job status changes to Slack channel', 'notifications'),
  ('slack_notify_job_assigned_dm', 'true'::jsonb, 'DM project manager on job updates', 'notifications'),
  ('slack_notify_payment_received_channel', 'true'::jsonb, 'Post payment received to Slack channel', 'notifications'),
  ('slack_notify_large_payment_dm', 'true'::jsonb, 'DM owners on large payment alerts', 'notifications'),
  ('slack_notify_follow_up_scheduled_dm', 'true'::jsonb, 'DM rep when a follow-up is scheduled', 'notifications'),
  ('slack_notify_overdue_follow_up_dm', 'true'::jsonb, 'DM rep and manager on overdue follow-ups', 'notifications')
ON CONFLICT (key) DO NOTHING;
