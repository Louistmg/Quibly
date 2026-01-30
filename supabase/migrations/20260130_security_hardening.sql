-- Security hardening for Quibly
-- RLS, auth-bound access, and server-side scoring

-- Extensions
create extension if not exists pgcrypto;

-- Enable and enforce RLS
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.game_sessions enable row level security;
alter table public.players enable row level security;
alter table public.player_answers enable row level security;

alter table public.quizzes force row level security;
alter table public.questions force row level security;
alter table public.answers force row level security;
alter table public.game_sessions force row level security;
alter table public.players force row level security;
alter table public.player_answers force row level security;

-- Add auth binding columns (non-breaking)
alter table public.players add column if not exists user_id uuid;
alter table public.player_answers add column if not exists user_id uuid;

alter table public.players alter column user_id set default auth.uid();
alter table public.player_answers alter column user_id set default auth.uid();
alter table public.quizzes alter column host_id set default auth.uid();
alter table public.game_sessions alter column host_id set default auth.uid();

-- Generate quiz code by default (6 chars)
CREATE OR REPLACE FUNCTION public.generate_quiz_code()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6));
$$;

alter table public.quizzes
  alter column code set default public.generate_quiz_code();

-- Indexes for RLS joins
create index if not exists players_user_id_idx on public.players (user_id);
create index if not exists players_session_id_idx on public.players (session_id);
create index if not exists player_answers_player_id_idx on public.player_answers (player_id);
create index if not exists player_answers_question_id_idx on public.player_answers (question_id);

-- Prevent duplicate joins/answers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'players_session_user_unique'
  ) THEN
    ALTER TABLE public.players
      ADD CONSTRAINT players_session_user_unique UNIQUE (session_id, user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'player_answers_player_question_unique'
  ) THEN
    ALTER TABLE public.player_answers
      ADD CONSTRAINT player_answers_player_question_unique UNIQUE (player_id, question_id);
  END IF;
END $$;

-- Policies: quizzes
DROP POLICY IF EXISTS quizzes_select_host ON public.quizzes;
DROP POLICY IF EXISTS quizzes_insert_host ON public.quizzes;
DROP POLICY IF EXISTS quizzes_update_host ON public.quizzes;

CREATE POLICY quizzes_select_host ON public.quizzes
  FOR SELECT TO authenticated
  USING (host_id = auth.uid());

CREATE POLICY quizzes_insert_host ON public.quizzes
  FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid());

CREATE POLICY quizzes_update_host ON public.quizzes
  FOR UPDATE TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- Policies: questions
DROP POLICY IF EXISTS questions_select_host ON public.questions;
DROP POLICY IF EXISTS questions_insert_host ON public.questions;

CREATE POLICY questions_select_host ON public.questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.quizzes q
      WHERE q.id = questions.quiz_id
        AND q.host_id = auth.uid()
    )
  );

CREATE POLICY questions_insert_host ON public.questions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.quizzes q
      WHERE q.id = questions.quiz_id
        AND q.host_id = auth.uid()
    )
  );

-- Policies: answers (correctness hidden from players)
DROP POLICY IF EXISTS answers_select_host ON public.answers;
DROP POLICY IF EXISTS answers_insert_host ON public.answers;

CREATE POLICY answers_select_host ON public.answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.questions qu
      JOIN public.quizzes q ON q.id = qu.quiz_id
      WHERE qu.id = answers.question_id
        AND q.host_id = auth.uid()
    )
  );

CREATE POLICY answers_insert_host ON public.answers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.questions qu
      JOIN public.quizzes q ON q.id = qu.quiz_id
      WHERE qu.id = answers.question_id
        AND q.host_id = auth.uid()
    )
  );

-- Policies: game_sessions
DROP POLICY IF EXISTS game_sessions_select_participants ON public.game_sessions;
DROP POLICY IF EXISTS game_sessions_insert_host ON public.game_sessions;
DROP POLICY IF EXISTS game_sessions_update_host ON public.game_sessions;

CREATE POLICY game_sessions_select_participants ON public.game_sessions
  FOR SELECT TO authenticated
  USING (
    host_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.players p
      WHERE p.session_id = game_sessions.id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY game_sessions_insert_host ON public.game_sessions
  FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid());

CREATE POLICY game_sessions_update_host ON public.game_sessions
  FOR UPDATE TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- Policies: players
DROP POLICY IF EXISTS players_select_session ON public.players;
DROP POLICY IF EXISTS players_insert_session ON public.players;

CREATE POLICY players_select_session ON public.players
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.players p2
      WHERE p2.session_id = players.session_id
        AND p2.user_id = auth.uid()
    )
  );

CREATE POLICY players_insert_session ON public.players
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.game_sessions s
      WHERE s.id = players.session_id
        AND s.status = 'waiting'
    )
    AND (
      is_host = false
      OR EXISTS (
        SELECT 1
        FROM public.game_sessions s
        WHERE s.id = players.session_id
          AND s.host_id = auth.uid()
      )
    )
  );

-- Policies: player_answers (block direct inserts, allow own reads)
DROP POLICY IF EXISTS player_answers_select_own ON public.player_answers;
DROP POLICY IF EXISTS player_answers_insert_block ON public.player_answers;

CREATE POLICY player_answers_select_own ON public.player_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.players p
      WHERE p.id = player_answers.player_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY player_answers_insert_block ON public.player_answers
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- RPC: public quiz payload without correct answers
CREATE OR REPLACE FUNCTION public.get_quiz_by_code_public(code_input text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', q.id,
    'title', q.title,
    'description', q.description,
    'code', q.code,
    'created_at', q.created_at,
    'questions', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', qu.id,
            'text', qu.text,
            'time_limit', qu.time_limit,
            'points', qu.points,
            'sort_order', qu.sort_order,
            'answers', (
              SELECT COALESCE(
                jsonb_agg(
                  jsonb_build_object(
                    'id', a.id,
                    'question_id', a.question_id,
                    'text', a.text,
                    'color', a.color,
                    'sort_order', a.sort_order
                  ) ORDER BY a.sort_order
                ),
                '[]'::jsonb
              )
              FROM public.answers a
              WHERE a.question_id = qu.id
            )
          ) ORDER BY qu.sort_order
        ),
        '[]'::jsonb
      )
      FROM public.questions qu
      WHERE qu.quiz_id = q.id
    )
  )
  FROM public.quizzes q
  WHERE q.code = code_input
  LIMIT 1;
$$;

-- RPC: get waiting session by code
CREATE OR REPLACE FUNCTION public.get_waiting_session_by_code(code_input text)
RETURNS TABLE (
  id uuid,
  quiz_id uuid,
  code text,
  status text,
  current_question_index integer,
  host_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.quiz_id, s.code, s.status, s.current_question_index, s.host_id
  FROM public.game_sessions s
  WHERE s.code = code_input
    AND s.status = 'waiting'
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;

-- RPC: server-side answer submission + scoring
CREATE OR REPLACE FUNCTION public.submit_answer(
  player_id_input uuid,
  question_id_input uuid,
  answer_id_input uuid,
  time_remaining_input integer
)
RETURNS TABLE (
  is_correct boolean,
  points_earned integer,
  correct_answer_id uuid,
  new_score integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_quiz_id uuid;
  v_question_points integer;
  v_time_limit integer;
  v_is_correct boolean := false;
  v_points integer := 0;
  v_correct_answer_id uuid;
  v_new_score integer;
  v_time_remaining integer;
BEGIN
  SELECT p.session_id
    INTO v_session_id
  FROM public.players p
  WHERE p.id = player_id_input
    AND p.user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT s.quiz_id
    INTO v_quiz_id
  FROM public.game_sessions s
  WHERE s.id = v_session_id
    AND s.status = 'playing';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_playing';
  END IF;

  SELECT q.points, q.time_limit
    INTO v_question_points, v_time_limit
  FROM public.questions q
  WHERE q.id = question_id_input
    AND q.quiz_id = v_quiz_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_question';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.player_answers pa
    WHERE pa.player_id = player_id_input
      AND pa.question_id = question_id_input
  ) THEN
    RAISE EXCEPTION 'already_answered';
  END IF;

  SELECT a.id
    INTO v_correct_answer_id
  FROM public.answers a
  WHERE a.question_id = question_id_input
    AND a.is_correct = true
  LIMIT 1;

  IF answer_id_input IS NOT NULL THEN
    SELECT a.is_correct
      INTO v_is_correct
    FROM public.answers a
    WHERE a.id = answer_id_input
      AND a.question_id = question_id_input;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'invalid_answer';
    END IF;
  END IF;

  IF v_is_correct THEN
    v_points := v_question_points;
  END IF;

  v_time_remaining := GREATEST(0, LEAST(COALESCE(time_remaining_input, 0), v_time_limit));

  INSERT INTO public.player_answers (
    player_id,
    question_id,
    answer_id,
    time_remaining,
    is_correct,
    points_earned,
    user_id
  ) VALUES (
    player_id_input,
    question_id_input,
    answer_id_input,
    v_time_remaining,
    v_is_correct,
    v_points,
    auth.uid()
  );

  UPDATE public.players
  SET score = score + v_points
  WHERE id = player_id_input
  RETURNING score INTO v_new_score;

  RETURN QUERY SELECT v_is_correct, v_points, v_correct_answer_id, v_new_score;
END;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_by_code_public(text) FROM public;
REVOKE ALL ON FUNCTION public.get_waiting_session_by_code(text) FROM public;
REVOKE ALL ON FUNCTION public.submit_answer(uuid, uuid, uuid, integer) FROM public;

GRANT EXECUTE ON FUNCTION public.get_quiz_by_code_public(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_waiting_session_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_answer(uuid, uuid, uuid, integer) TO authenticated;
