import { useState, useCallback } from 'react'
import { supabase, type Quiz, type Question, type PublicAnswer, type GameSession, type Player } from '@/lib/supabase'

type PublicQuiz = Quiz & { questions: (Question & { answers: PublicAnswer[] })[] }

type SubmitAnswerResult = {
  is_correct: boolean
  points_earned: number
  correct_answer_id: string | null
  new_score: number | null
}

type AnswerStats = {
  total_players: number
  total_answers: number
  correct_answer_id: string | null
  answers: { id: string; text: string; color: 'red' | 'blue' | 'yellow' | 'green'; count: number }[]
}

const QUIZ_CODE_LENGTH = 6
const QUIZ_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const generateQuizCode = () => {
  const values = new Uint32Array(QUIZ_CODE_LENGTH)
  crypto.getRandomValues(values)
  return Array.from(values, (value) => QUIZ_CODE_CHARS[value % QUIZ_CODE_CHARS.length]).join('')
}

export function useSupabase() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const ensureAuth = useCallback(async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError

    const existingUserId = sessionData.session?.user?.id
    if (existingUserId) {
      setUserId(existingUserId)
      return existingUserId
    }

    const { data, error: signInError } = await supabase.auth.signInAnonymously()
    if (signInError) throw signInError

    const signedInUserId = data.user?.id
    if (!signedInUserId) {
      throw new Error('Authentication failed.')
    }

    setUserId(signedInUserId)
    return signedInUserId
  }, [])

  const createQuiz = useCallback(async (title: string, description: string, questions: { text: string; time_limit: number; points: number; answers: { text: string; is_correct: boolean; color: 'red' | 'blue' | 'yellow' | 'green' }[] }[]) => {
    setLoading(true)
    try {
      const hostId = await ensureAuth()
      const maxAttempts = 5
      let quiz: Quiz | null = null
      let lastError: unknown = null

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const code = generateQuizCode()
        const { data, error: quizError } = await supabase
          .from('quizzes')
          .insert([{ title, description, host_id: hostId, code }])
          .select()
          .single()

        if (!quizError) {
          quiz = data as Quiz
          break
        }

        lastError = quizError
        if ((quizError as { code?: string }).code !== '23505') {
          throw quizError
        }
      }

      if (!quiz) {
        throw lastError
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const { data: question, error: questionError } = await supabase
          .from('questions')
          .insert([{ 
            quiz_id: quiz.id, 
            text: q.text, 
            time_limit: q.time_limit, 
            points: q.points,
            sort_order: i 
          }])
          .select()
          .single()

        if (questionError) throw questionError

        const answersToInsert = q.answers.map((a, idx) => ({
          question_id: question.id,
          text: a.text,
          is_correct: a.is_correct,
          color: a.color,
          sort_order: idx
        }))

        const { error: answersError } = await supabase
          .from('answers')
          .insert(answersToInsert)

        if (answersError) throw answersError
      }

      return quiz
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [ensureAuth])

  const getQuizByCode = useCallback(async (code: string) => {
    setLoading(true)
    try {
      await ensureAuth()
      const { data, error } = await supabase.rpc('get_quiz_by_code_public', { code_input: code })

      if (error) throw error
      return data as PublicQuiz | null
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [ensureAuth])

  const createGameSession = useCallback(async (quizId: string) => {
    setLoading(true)
    try {
      const hostId = await ensureAuth()
      const { data: quiz } = await supabase
        .from('quizzes')
        .select('code')
        .eq('id', quizId)
        .single()

      const { data, error } = await supabase
        .from('game_sessions')
        .insert([{ 
          quiz_id: quizId, 
          code: quiz?.code || '',
          host_id: hostId 
        }])
        .select()
        .single()

      if (error) throw error
      return data as GameSession
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [ensureAuth])

  const joinGame = useCallback(async (sessionId: string, name: string) => {
    setLoading(true)
    try {
      const authUserId = await ensureAuth()
      const { data, error } = await supabase
        .from('players')
        .insert([{ session_id: sessionId, name, is_host: false, user_id: authUserId }])
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          const { data: existingPlayer, error: existingError } = await supabase
            .from('players')
            .select('*')
            .eq('session_id', sessionId)
            .eq('user_id', authUserId)
            .single()

          if (existingError) throw existingError
          return existingPlayer as Player
        }

        throw error
      }

      return data as Player
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [ensureAuth])

  const getPlayers = useCallback(async (sessionId: string) => {
    await ensureAuth()
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .order('score', { ascending: false })

    if (error) throw error
    return data as Player[]
  }, [ensureAuth])

  const getSessionById = useCallback(async (sessionId: string) => {
    await ensureAuth()
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    if (error) throw error
    return data as GameSession | null
  }, [ensureAuth])

  const getPlayerById = useCallback(async (playerId: string) => {
    await ensureAuth()
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .maybeSingle()

    if (error) throw error
    return data as Player | null
  }, [ensureAuth])

  const getPlayerBySession = useCallback(async (sessionId: string) => {
    const authUserId = await ensureAuth()
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', authUserId)
      .maybeSingle()

    if (error) throw error
    return data as Player | null
  }, [ensureAuth])

  const updateSessionStatus = useCallback(async (sessionId: string, status: 'waiting' | 'playing' | 'finished') => {
    await ensureAuth()
    const { error } = await supabase
      .from('game_sessions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (error) throw error
  }, [ensureAuth])

  const updateSessionState = useCallback(async (
    sessionId: string,
    updates: {
      status?: 'waiting' | 'playing' | 'finished'
      phase?: 'question' | 'results' | 'scoreboard'
      currentQuestionIndex?: number
      questionStartedAt?: string | null
      startedAt?: string | null
      endedAt?: string | null
    }
  ) => {
    await ensureAuth()
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (typeof updates.status !== 'undefined') payload.status = updates.status
    if (typeof updates.phase !== 'undefined') payload.phase = updates.phase
    if (typeof updates.currentQuestionIndex === 'number') payload.current_question_index = updates.currentQuestionIndex
    if (typeof updates.questionStartedAt !== 'undefined') payload.question_started_at = updates.questionStartedAt
    if (typeof updates.startedAt !== 'undefined') payload.started_at = updates.startedAt
    if (typeof updates.endedAt !== 'undefined') payload.ended_at = updates.endedAt

    const { error } = await supabase
      .from('game_sessions')
      .update(payload)
      .eq('id', sessionId)

    if (error) throw error
  }, [ensureAuth])

  const submitAnswer = useCallback(async (
    playerId: string, 
    questionId: string, 
    answerId: string | null, 
    timeRemaining: number
  ) => {
    await ensureAuth()
    const { data, error } = await supabase.rpc('submit_answer', {
      player_id_input: playerId,
      question_id_input: questionId,
      answer_id_input: answerId,
      time_remaining_input: timeRemaining
    })

    if (error) throw error
    return data as SubmitAnswerResult
  }, [ensureAuth])

  const getWaitingSessionByCode = useCallback(async (code: string) => {
    await ensureAuth()
    const { data, error } = await supabase.rpc('get_waiting_session_by_code', { code_input: code })

    if (error) throw error
    if (!data) return null
    const session = Array.isArray(data) ? data[0] : data
    if (!session || typeof session !== 'object' || !('id' in session)) {
      return null
    }
    return session as GameSession
  }, [ensureAuth])

  const getAnswerStats = useCallback(async (sessionId: string, questionId: string) => {
    await ensureAuth()
    const { data, error } = await supabase.rpc('get_answer_stats', {
      session_id_input: sessionId,
      question_id_input: questionId
    })

    if (error) throw error
    return data as AnswerStats
  }, [ensureAuth])

  const subscribeToSession = useCallback((sessionId: string, callback: (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => void) => {
    let subscription: ReturnType<typeof supabase.channel> | null = null
    let isClosed = false

    const start = async () => {
      try {
        await ensureAuth()
        if (isClosed) return
        subscription = supabase
          .channel(`session:${sessionId}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'game_sessions',
            filter: `id=eq.${sessionId}`
          }, callback)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'players',
            filter: `session_id=eq.${sessionId}`
          }, callback)
          .subscribe()
      } catch (err) {
        console.error('Realtime subscription failed:', err)
      }
    }

    void start()

    return () => {
      isClosed = true
      subscription?.unsubscribe()
    }
  }, [ensureAuth])

  const subscribeToGameSession = useCallback((sessionId: string, callback: (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => void) => {
    let subscription: ReturnType<typeof supabase.channel> | null = null
    let isClosed = false

    const start = async () => {
      try {
        await ensureAuth()
        if (isClosed) return
        subscription = supabase
          .channel(`game-session:${sessionId}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'game_sessions',
            filter: `id=eq.${sessionId}`
          }, callback)
          .subscribe()
      } catch (err) {
        console.error('Realtime subscription failed:', err)
      }
    }

    void start()

    return () => {
      isClosed = true
      subscription?.unsubscribe()
    }
  }, [ensureAuth])

  return {
    loading,
    error,
    userId,
    ensureAuth,
    createQuiz,
    getQuizByCode,
    createGameSession,
    joinGame,
    getPlayers,
    updateSessionStatus,
    updateSessionState,
    submitAnswer,
    getWaitingSessionByCode,
    getAnswerStats,
    getSessionById,
    getPlayerById,
    getPlayerBySession,
    subscribeToSession,
    subscribeToGameSession
  }
}
