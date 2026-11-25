-- Craft SMP fresh-project schema.
-- Run once in the Supabase SQL Editor for a new project. This is not a migration
-- for an existing database; it does not drop existing data or reconcile history.
-- Do not apply it with `supabase db push`; it is a standalone setup script.
-- After creating an Auth user, promote its profile to admin with:
--   UPDATE public.profiles SET role = 'admin' WHERE id = '<auth-user-uuid>';

BEGIN;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  minecraft_username text
    CHECK (minecraft_username IS NULL OR minecraft_username ~ '^\.?[A-Za-z0-9_]{3,16}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

INSERT INTO public.profiles (id, email)
SELECT id, email
FROM auth.users
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = now();

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (minecraft_username, updated_at) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

DROP POLICY IF EXISTS "Users and admins can read profiles" ON public.profiles;
CREATE POLICY "Users and admins can read profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY
    CHECK (id ~ '^[a-z0-9][a-z0-9_-]{0,79}$'),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  category text NOT NULL
    CHECK (category IN ('ranks', 'coins', 'crates', 'bundles', 'cosmetics')),
  price_paise integer NOT NULL CHECK (price_paise BETWEEN 0 AND 10000000),
  original_price_paise integer
    CHECK (original_price_paise BETWEEN price_paise AND 10000000),
  description text NOT NULL DEFAULT '',
  perks text[] NOT NULL DEFAULT ARRAY[]::text[]
    CHECK (cardinality(perks) <= 100),
  delivery_commands text[] NOT NULL DEFAULT ARRAY[]::text[]
    CHECK (cardinality(delivery_commands) <= 10),
  image_key text NOT NULL DEFAULT 'rank'
    CHECK (image_key IN ('rank', 'coins', 'crate')),
  image_url text,
  featured boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  single boolean NOT NULL DEFAULT false,
  tint text NOT NULL DEFAULT 'sky'
    CHECK (tint IN ('sky', 'lilac', 'blush', 'lavender', 'primary')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (price_paise > 0 OR category = 'ranks'),
  CHECK (
    original_price_paise IS NULL
    OR (price_paise > 0 AND original_price_paise >= price_paise)
  )
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.products FROM anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

DROP POLICY IF EXISTS "Visitors can read enabled products" ON public.products;
CREATE POLICY "Visitors can read enabled products"
  ON public.products FOR SELECT TO anon, authenticated
  USING (enabled OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE TABLE IF NOT EXISTS public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE
    CHECK (code = upper(btrim(code)) AND code ~ '^[A-Z0-9][A-Z0-9_-]{0,39}$'),
  percent_off integer NOT NULL CHECK (percent_off BETWEEN 1 AND 100),
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.discount_codes FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_codes TO service_role;

DROP POLICY IF EXISTS "Admins can manage discount codes" ON public.discount_codes;
CREATE POLICY "Admins can manage discount codes"
  ON public.discount_codes FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE OR REPLACE FUNCTION public.validate_discount_code(p_code text)
RETURNS TABLE (code text, percent_off integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT discount.code, discount.percent_off
  FROM public.discount_codes AS discount
  WHERE discount.code = upper(btrim(p_code))
    AND discount.active
    AND (discount.expires_at IS NULL OR discount.expires_at > now())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.validate_discount_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_discount_code(text)
  TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  minecraft_username text NOT NULL
    CHECK (minecraft_username ~ '^\.?[A-Za-z0-9_]{3,16}$'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'completed', 'rejected', 'cancelled', 'refunded')),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  subtotal_paise integer NOT NULL CHECK (subtotal_paise > 0),
  discount_paise integer NOT NULL DEFAULT 0
    CHECK (discount_paise >= 0 AND discount_paise <= subtotal_paise),
  total_paise integer NOT NULL
    CHECK (total_paise >= 100 AND total_paise = subtotal_paise - discount_paise),
  discount_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  paid_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_user_created_at_idx
  ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_created_at_idx
  ON public.orders (status, created_at);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.orders FROM anon, authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

DROP POLICY IF EXISTS "Users and admins can read orders" ON public.orders;
CREATE POLICY "Users and admins can read orders"
  ON public.orders FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id text REFERENCES public.products(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  unit_price_paise integer NOT NULL CHECK (unit_price_paise > 0),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  delivery_commands text[] NOT NULL
    CHECK (cardinality(delivery_commands) BETWEEN 1 AND 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx
  ON public.order_items (order_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_items FROM anon, authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

DROP POLICY IF EXISTS "Admins can read order items" ON public.order_items;
CREATE POLICY "Admins can read order items"
  ON public.order_items FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

CREATE TABLE IF NOT EXISTS public.order_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  previous_status text
    CHECK (previous_status IS NULL OR previous_status IN ('pending', 'paid', 'completed', 'rejected', 'cancelled', 'refunded')),
  new_status text NOT NULL
    CHECK (new_status IN ('pending', 'paid', 'completed', 'rejected', 'cancelled', 'refunded')),
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_source text NOT NULL
    CHECK (change_source IN ('admin', 'gmail_auto_approval', 'minecraft_delivery')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_status_events_order_id_idx
  ON public.order_status_events (order_id, created_at);

ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_status_events FROM anon, authenticated;
GRANT SELECT ON public.order_status_events TO authenticated;
GRANT ALL ON public.order_status_events TO service_role;

DROP POLICY IF EXISTS "Admins can read order status events" ON public.order_status_events;
CREATE POLICY "Admins can read order status events"
  ON public.order_status_events FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

CREATE TABLE IF NOT EXISTS public.fulfillment_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL UNIQUE
    REFERENCES public.order_items(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'delivered', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fulfillment_queue_status_created_at_idx
  ON public.fulfillment_queue (status, created_at);

ALTER TABLE public.fulfillment_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fulfillment_queue FROM anon, authenticated;
GRANT SELECT ON public.fulfillment_queue TO authenticated;
GRANT ALL ON public.fulfillment_queue TO service_role;

DROP POLICY IF EXISTS "Admins can read fulfillment queue" ON public.fulfillment_queue;
CREATE POLICY "Admins can read fulfillment queue"
  ON public.fulfillment_queue FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

CREATE OR REPLACE FUNCTION public.set_admin_order_status(
  p_order_id uuid,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('pending', 'paid', 'rejected', 'refunded', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid administrator order status' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_order.status = p_status THEN
    RETURN false;
  END IF;

  IF p_status = 'paid' AND NOT EXISTS (
    SELECT 1 FROM public.order_items WHERE order_id = p_order_id
  ) THEN
    RAISE EXCEPTION 'An order without items cannot be marked paid'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.orders
  SET status = p_status,
      paid_at = CASE
        WHEN p_status = 'paid' THEN COALESCE(paid_at, now())
        ELSE paid_at
      END,
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.order_status_events (
    order_id, previous_status, new_status, changed_by, change_source
  )
  VALUES (p_order_id, v_order.status, p_status, (SELECT auth.uid()), 'admin');

  IF p_status = 'paid' THEN
    INSERT INTO public.fulfillment_queue (order_item_id)
    SELECT item.id
    FROM public.order_items AS item
    WHERE item.order_id = p_order_id
    ON CONFLICT (order_item_id) DO NOTHING;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.set_admin_order_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_admin_order_status(uuid, text)
  TO authenticated;

CREATE TABLE IF NOT EXISTS public.voting_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  url text NOT NULL
    CHECK (url ~* '^https?://[^[:space:]]+$'),
  description text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voting_sites_name_idx ON public.voting_sites (name);

ALTER TABLE public.voting_sites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.voting_sites FROM anon, authenticated;
GRANT SELECT ON public.voting_sites TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.voting_sites TO authenticated;
GRANT ALL ON public.voting_sites TO service_role;

DROP POLICY IF EXISTS "Visitors can read enabled voting sites" ON public.voting_sites;
CREATE POLICY "Visitors can read enabled voting sites"
  ON public.voting_sites FOR SELECT TO anon, authenticated
  USING (enabled OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins can manage voting sites" ON public.voting_sites;
CREATE POLICY "Admins can manage voting sites"
  ON public.voting_sites FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE TABLE IF NOT EXISTS public.site_announcements (
  id text PRIMARY KEY,
  message text NOT NULL DEFAULT '' CHECK (char_length(message) <= 240),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_announcements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_announcements FROM anon, authenticated;
GRANT SELECT ON public.site_announcements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_announcements TO authenticated;
GRANT ALL ON public.site_announcements TO service_role;

DROP POLICY IF EXISTS "Visitors can read enabled announcements" ON public.site_announcements;
CREATE POLICY "Visitors can read enabled announcements"
  ON public.site_announcements FOR SELECT TO anon, authenticated
  USING (enabled OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins can manage announcements" ON public.site_announcements;
CREATE POLICY "Admins can manage announcements"
  ON public.site_announcements FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

INSERT INTO public.site_announcements (id, message, enabled)
VALUES ('global', 'Welcome to Craft SMP — jump in and start your next adventure.', true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.wishlists (
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wishlists FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;

DROP POLICY IF EXISTS "Users can view their own wishlists" ON public.wishlists;
CREATE POLICY "Users can view their own wishlists"
  ON public.wishlists FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can add to their own wishlists" ON public.wishlists;
CREATE POLICY "Users can add to their own wishlists"
  ON public.wishlists FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can remove from their own wishlists" ON public.wishlists;
CREATE POLICY "Users can remove from their own wishlists"
  ON public.wishlists FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.server_status (
  id text PRIMARY KEY CHECK (id = 'main'),
  online boolean NOT NULL DEFAULT false,
  online_players integer NOT NULL DEFAULT 0 CHECK (online_players >= 0),
  max_players integer NOT NULL DEFAULT 0 CHECK (max_players BETWEEN 0 AND 100000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (online_players <= max_players),
  CHECK (online OR online_players = 0)
);

ALTER TABLE public.server_status ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.server_status FROM anon, authenticated;
GRANT SELECT ON public.server_status TO anon, authenticated;
GRANT ALL ON public.server_status TO service_role;

DROP POLICY IF EXISTS "Visitors can read server status" ON public.server_status;
CREATE POLICY "Visitors can read server status"
  ON public.server_status FOR SELECT TO anon, authenticated
  USING (true);

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
  ON public.server_chat_messages FOR SELECT TO anon, authenticated
  USING (created_at >= now() - interval '24 hours');

CREATE OR REPLACE FUNCTION public.prune_old_server_chat_messages()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
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

CREATE TABLE IF NOT EXISTS public.gmail_payment_checkpoints (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  history_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gmail_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id text NOT NULL UNIQUE CHECK (char_length(gmail_message_id) > 0),
  sender text,
  received_at timestamptz,
  transaction_id text,
  utr text,
  amount_paise integer CHECK (amount_paise IS NULL OR amount_paise > 0),
  currency text CHECK (currency IS NULL OR currency = 'INR'),
  payment_status text NOT NULL CHECK (payment_status IN ('received', 'ambiguous')),
  dkim_pass boolean NOT NULL DEFAULT false,
  sender_auth_pass boolean NOT NULL DEFAULT false,
  authentication_result text,
  order_id_hint uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  review_status text NOT NULL DEFAULT 'manual_review'
    CHECK (review_status IN ('manual_review', 'reviewed', 'rejected')),
  review_reason text NOT NULL DEFAULT '',
  admin_review_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gmail_payment_events_received_at_idx
  ON public.gmail_payment_events (received_at DESC);
CREATE INDEX IF NOT EXISTS gmail_payment_events_order_hint_idx
  ON public.gmail_payment_events (order_id_hint);
CREATE INDEX IF NOT EXISTS gmail_payment_events_transaction_id_idx
  ON public.gmail_payment_events (transaction_id)
  WHERE transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS gmail_payment_events_utr_idx
  ON public.gmail_payment_events (utr)
  WHERE utr IS NOT NULL;

ALTER TABLE public.gmail_payment_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_payment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gmail_payment_checkpoints FROM anon, authenticated;
REVOKE ALL ON public.gmail_payment_events FROM anon, authenticated;
GRANT SELECT ON public.gmail_payment_events TO authenticated;
GRANT ALL ON public.gmail_payment_checkpoints TO service_role;
GRANT ALL ON public.gmail_payment_events TO service_role;

DROP POLICY IF EXISTS "Admins can read Gmail payment evidence"
  ON public.gmail_payment_events;
CREATE POLICY "Admins can read Gmail payment evidence"
  ON public.gmail_payment_events FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

CREATE OR REPLACE FUNCTION public.record_gmail_payment_event(
  p_gmail_message_id text,
  p_sender text,
  p_received_at timestamptz,
  p_transaction_id text,
  p_utr text,
  p_amount_paise integer,
  p_currency text,
  p_payment_status text,
  p_dkim_pass boolean,
  p_authentication_result text,
  p_order_id_hint uuid,
  p_review_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  IF (SELECT auth.role()) <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.gmail_payment_events (
    gmail_message_id, sender, received_at, transaction_id, utr,
    amount_paise, currency, payment_status, dkim_pass,
    authentication_result, order_id_hint, review_reason
  )
  VALUES (
    p_gmail_message_id, p_sender, p_received_at, p_transaction_id, p_utr,
    p_amount_paise, p_currency, p_payment_status, p_dkim_pass,
    p_authentication_result, p_order_id_hint, COALESCE(p_review_reason, '')
  )
  ON CONFLICT (gmail_message_id) DO UPDATE
    SET sender = EXCLUDED.sender,
        received_at = EXCLUDED.received_at,
        transaction_id = EXCLUDED.transaction_id,
        utr = EXCLUDED.utr,
        amount_paise = EXCLUDED.amount_paise,
        currency = EXCLUDED.currency,
        payment_status = EXCLUDED.payment_status,
        dkim_pass = EXCLUDED.dkim_pass,
        authentication_result = EXCLUDED.authentication_result,
        order_id_hint = EXCLUDED.order_id_hint,
        review_reason = EXCLUDED.review_reason
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_gmail_payment_event(
  text, text, timestamptz, text, text, integer, text, text, boolean, text, uuid, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_gmail_payment_event(
  text, text, timestamptz, text, text, integer, text, text, boolean, text, uuid, text
) TO service_role;

CREATE OR REPLACE FUNCTION public.auto_approve_gmail_payment_event(
  p_event_id uuid,
  p_expected_sender text,
  p_sender_authenticated boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event public.gmail_payment_events%ROWTYPE;
  v_order public.orders%ROWTYPE;
BEGIN
  IF (SELECT auth.role()) <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_event
  FROM public.gmail_payment_events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.gmail_payment_events
  SET sender_auth_pass = COALESCE(p_sender_authenticated, false)
  WHERE id = p_event_id;
  v_event.sender_auth_pass := COALESCE(p_sender_authenticated, false);

  IF v_event.review_status <> 'manual_review'
    OR v_event.sender IS DISTINCT FROM lower(btrim(p_expected_sender))
    OR NOT v_event.sender_auth_pass
    OR v_event.payment_status <> 'received'
    OR v_event.amount_paise IS NULL
    OR v_event.currency <> 'INR'
    OR (v_event.transaction_id IS NULL AND v_event.utr IS NULL)
    OR v_event.order_id_hint IS NULL
    OR v_event.received_at IS NULL THEN
    RETURN false;
  END IF;

  IF v_event.transaction_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(
      pg_catalog.hashtext('gmail-transaction:' || v_event.transaction_id)
    );
  END IF;
  IF v_event.utr IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(
      pg_catalog.hashtext('gmail-utr:' || v_event.utr)
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.gmail_payment_events AS prior_event
    WHERE prior_event.id <> v_event.id
      AND prior_event.review_status = 'reviewed'
      AND prior_event.admin_review_reason LIKE 'Automatically accepted:%'
      AND (
        (v_event.transaction_id IS NOT NULL
          AND prior_event.transaction_id = v_event.transaction_id)
        OR (v_event.utr IS NOT NULL AND prior_event.utr = v_event.utr)
      )
  ) THEN
    UPDATE public.gmail_payment_events
    SET review_reason = 'A previously accepted payment reference was detected.'
    WHERE id = p_event_id;
    RETURN false;
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = v_event.order_id_hint
  FOR UPDATE;

  IF NOT FOUND
    OR v_order.status <> 'pending'
    OR v_order.currency <> v_event.currency
    OR v_order.total_paise <> v_event.amount_paise
    OR v_event.received_at < v_order.created_at
    OR v_event.received_at > v_order.expires_at
    OR NOT EXISTS (
      SELECT 1 FROM public.order_items WHERE order_id = v_order.id
    ) THEN
    RETURN false;
  END IF;

  UPDATE public.orders
  SET status = 'paid',
      paid_at = COALESCE(v_event.received_at, now()),
      updated_at = now()
  WHERE id = v_order.id;

  INSERT INTO public.order_status_events (
    order_id, previous_status, new_status, changed_by, change_source
  )
  VALUES (v_order.id, 'pending', 'paid', NULL, 'gmail_auto_approval');

  INSERT INTO public.fulfillment_queue (order_item_id)
  SELECT item.id
  FROM public.order_items AS item
  WHERE item.order_id = v_order.id
  ON CONFLICT (order_item_id) DO NOTHING;

  UPDATE public.gmail_payment_events
  SET review_status = 'reviewed',
      admin_review_reason = 'Automatically accepted: authenticated sender, exact order ID, and exact amount matched.'
  WHERE id = p_event_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_approve_gmail_payment_event(uuid, text, boolean)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_approve_gmail_payment_event(uuid, text, boolean)
  TO service_role;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
CREATE POLICY "Admins can update product images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND (SELECT public.is_admin()))
  WITH CHECK (bucket_id = 'product-images' AND (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND (SELECT public.is_admin()));

COMMIT;
