CREATE TABLE IF NOT EXISTS public.server_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL
    CHECK (player_name ~ '^\.?[A-Za-z0-9_]{3,16}$'),
  message text NOT NULL
    CHECK (char_length(btrim(message)) BETWEEN 1 AND 256)
    CHECK (message !~ '[[:cntrl:]]'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS server_chat_messages_created_at_idx
  ON public.server_chat_messages (created_at DESC);

ALTER TABLE public.server_chat_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.server_chat_messages FROM anon, authenticated;
GRANT SELECT (id, player_name, message, created_at)
  ON public.server_chat_messages TO anon, authenticated;
GRANT ALL ON public.server_chat_messages TO service_role;

DROP POLICY IF EXISTS "Visitors can read recent server chat"
  ON public.server_chat_messages;
CREATE POLICY "Visitors can read recent server chat"
  ON public.server_chat_messages FOR SELECT
  TO anon, authenticated
  USING (created_at >= now() - interval '24 hours');

CREATE OR REPLACE FUNCTION public.prune_old_server_chat_messages()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.server_chat_messages
  WHERE created_at < now() - interval '7 days';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prune_old_server_chat_messages
  ON public.server_chat_messages;
CREATE TRIGGER prune_old_server_chat_messages
  AFTER INSERT ON public.server_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.prune_old_server_chat_messages();

REVOKE ALL ON FUNCTION public.prune_old_server_chat_messages() FROM PUBLIC;
