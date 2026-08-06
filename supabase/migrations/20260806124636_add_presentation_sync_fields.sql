ALTER TABLE public.apresentacoes
  ADD COLUMN sync_status text NOT NULL DEFAULT 'synced',
  ADD COLUMN last_synced_at timestamp with time zone NULL,
  ADD COLUMN sync_error text NULL,
  ADD CONSTRAINT check_sync_status CHECK (sync_status IN ('synced', 'pending', 'google_deleted', 'error'));
