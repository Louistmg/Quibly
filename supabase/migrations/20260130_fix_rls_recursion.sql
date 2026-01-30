-- Fix RLS recursion in players/game_sessions policies

CREATE OR REPLACE FUNCTION public.is_session_member(session_id_input uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.players p
    WHERE p.session_id = session_id_input
      AND p.user_id = auth.uid()
  );
$$;

ALTER FUNCTION public.is_session_member(uuid) SET row_security = off;

REVOKE ALL ON FUNCTION public.is_session_member(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_session_member(uuid) TO authenticated;

-- Recreate policies using the helper function to avoid recursion
DROP POLICY IF EXISTS game_sessions_select_participants ON public.game_sessions;
CREATE POLICY game_sessions_select_participants ON public.game_sessions
  FOR SELECT TO authenticated
  USING (
    host_id = auth.uid()
    OR public.is_session_member(game_sessions.id)
  );

DROP POLICY IF EXISTS players_select_session ON public.players;
CREATE POLICY players_select_session ON public.players
  FOR SELECT TO authenticated
  USING (public.is_session_member(players.session_id));
