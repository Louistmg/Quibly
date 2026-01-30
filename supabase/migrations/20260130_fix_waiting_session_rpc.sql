-- Return a single JSON object for waiting session RPC

DROP FUNCTION IF EXISTS public.get_waiting_session_by_code(text);

CREATE FUNCTION public.get_waiting_session_by_code(code_input text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(s)
  FROM public.game_sessions s
  WHERE s.code = code_input
    AND s.status = 'waiting'
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;
