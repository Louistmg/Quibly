import { useState, useCallback } from 'react'
import { supabase, type Quiz, type Question, type Answer, type GameSession, type Player } from '@/lib/supabase'

export function useSupabase() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createQuiz = useCallback(async (title: string, description: string, questions: { text: string; time_limit: number; points: number; answers: { text: string; is_correct: boolean; color: 'red' | 'blue' | 'yellow' | 'green' }[] }[]) => {
    setLoading(true)
    try {
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert([{ title, description, host_id: crypto.randomUUID() }])
        .select()
        .single()

      if (quizError) throw quizError

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
  }, [])

  const getQuizByCode = useCallback(async (code: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          questions:questions(*, answers:answers(*))
        `)
        .eq('code', code)
        .single()

      if (error) throw error
      return data as Quiz & { questions: (Question & { answers: Answer[] })[] }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const createGameSession = useCallback(async (quizId: string, hostId: string) => {
    setLoading(true)
    try {
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
  }, [])

  const joinGame = useCallback(async (sessionId: string, name: string, isHost = false) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('players')
        .insert([{ session_id: sessionId, name, is_host: isHost }])
        .select()
        .single()

      if (error) throw error
      return data as Player
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getPlayers = useCallback(async (sessionId: string) => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .order('score', { ascending: false })

    if (error) throw error
    return data as Player[]
  }, [])

  const updateSessionStatus = useCallback(async (sessionId: string, status: 'waiting' | 'playing' | 'finished') => {
    const { error } = await supabase
      .from('game_sessions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (error) throw error
  }, [])

  const submitAnswer = useCallback(async (
    playerId: string, 
    questionId: string, 
    answerId: string | null, 
    timeRemaining: number,
    isCorrect: boolean,
    pointsEarned: number
  ) => {
    const { error } = await supabase
      .from('player_answers')
      .insert([{
        player_id: playerId,
        question_id: questionId,
        answer_id: answerId,
        time_remaining: timeRemaining,
        is_correct: isCorrect,
        points_earned: pointsEarned
      }])

    if (error) throw error

    const { error: scoreError } = await supabase.rpc('increment_player_score', {
      player_id: playerId,
      points: pointsEarned
    })

    if (scoreError) {
      const { data: player } = await supabase
        .from('players')
        .select('score')
        .eq('id', playerId)
        .single()
      
      await supabase
        .from('players')
        .update({ score: (player?.score || 0) + pointsEarned })
        .eq('id', playerId)
    }
  }, [])

  const subscribeToSession = useCallback((sessionId: string, callback: (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => void) => {
    const subscription = supabase
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

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    loading,
    error,
    createQuiz,
    getQuizByCode,
    createGameSession,
    joinGame,
    getPlayers,
    updateSessionStatus,
    submitAnswer,
    subscribeToSession
  }
}
