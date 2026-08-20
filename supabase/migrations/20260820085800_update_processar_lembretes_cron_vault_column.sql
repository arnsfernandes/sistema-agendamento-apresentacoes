-- Migration: Update processar-lembretes-a-cada-5-minutos cron job to use decrypted_secret
-- Date: 2026-08-20 08:58:00

-- Unschedule existing job if it exists to avoid duplication issues
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'processar-lembretes-a-cada-5-minutos';

-- Schedule the processar-lembretes Edge Function every 5 minutes using pg_cron and pg_net with decrypted_secret
SELECT cron.schedule(
  'processar-lembretes-a-cada-5-minutos',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jhpuyflyddxwnxrbqiso.supabase.co/functions/v1/processar-lembretes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'lembretes_cron_secret' LIMIT 1)
    )
  );
  $$
);
