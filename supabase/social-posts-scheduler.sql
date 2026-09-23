-- Run this only after deploying the scheduler API and adding these Vercel variables:
--   SUPABASE_SERVICE_ROLE_KEY
--   SOCIAL_CRON_SECRET
-- Replace REPLACE_WITH_THE_SAME_SOCIAL_CRON_SECRET below with the exact
-- SOCIAL_CRON_SECRET value used in Vercel. Do not commit the filled-in value.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret(
  'https://www.medicalequipes.com/api/social/process-scheduled',
  'medicalequipes_social_scheduler_url',
  'MedicalEquipes scheduled social publishing endpoint'
)
where not exists (
  select 1 from vault.decrypted_secrets
  where name = 'medicalequipes_social_scheduler_url'
);

select vault.create_secret(
  'REPLACE_WITH_THE_SAME_SOCIAL_CRON_SECRET',
  'medicalequipes_social_cron_secret',
  'Secret used to authorize scheduled social publishing'
)
where not exists (
  select 1 from vault.decrypted_secrets
  where name = 'medicalequipes_social_cron_secret'
);

select cron.unschedule(jobid)
from cron.job
where jobname = 'medicalequipes-social-posts';

select cron.schedule(
  'medicalequipes-social-posts',
  '* * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'medicalequipes_social_scheduler_url'
      limit 1
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'medicalequipes_social_cron_secret'
        limit 1
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
