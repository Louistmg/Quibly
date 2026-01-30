import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { StopWatchIcon, CrownIcon, Tick02Icon, Cancel02Icon } from 'hugeicons-react'
import { GameSession, Quiz, Player, Question, Answer } from '@/types'
import { useSupabase } from '@/hooks/useSupabase'
import type { Player as DbPlayer } from '@/lib/supabase'

interface PlayGameProps {
  session: GameSession | null
  quiz: Quiz | null
  player: Player | null
}

const getAnswerColorClass = (_: Answer['color'], selected: boolean, showCorrect: boolean, isCorrect: boolean) => {
  if (showCorrect) {
    if (isCorrect) return 'ring-4 ring-white/50 scale-105'
    return 'opacity-50'
  }
  if (selected) return 'ring-4 ring-white/50 scale-105'
  return ''
}

const getAnswerBgClass = (color: Answer['color']) => {
  switch (color) {
    case 'red': return 'bg-[hsl(var(--answer-red))]'
    case 'blue': return 'bg-[hsl(var(--answer-blue))]'
    case 'yellow': return 'bg-[hsl(var(--answer-yellow))] text-foreground'
    case 'green': return 'bg-[hsl(var(--answer-green))]'
  }
}

const getAnswerShape = (color: Answer['color']) => {
  switch (color) {
    case 'red': return 'rounded-tr-2xl'
    case 'blue': return 'rounded-tl-2xl'
    case 'yellow': return 'rounded-br-2xl'
    case 'green': return 'rounded-bl-2xl'
  }
}

export function PlayGame({ session, quiz, player }: PlayGameProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [score, setScore] = useState(() => player?.score ?? 0)
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; pointsEarned: number; correctAnswerId: string | null } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const { submitAnswer, getPlayers, subscribeToSession } = useSupabase()

  const currentQuestionIndex = session?.currentQuestionIndex ?? 0
  const currentQuestion: Question | undefined = quiz?.questions[currentQuestionIndex]
  const phase = session?.phase ?? 'question'
  const showResult = phase === 'results'
  
  const [timeRemaining, setTimeRemaining] = useState(() => currentQuestion?.timeLimit ?? 0)
  const hasSubmittedRef = useRef(false)
  const [players, setPlayers] = useState<Player[]>([])

  const mapDbPlayers = useCallback((dbPlayers: DbPlayer[]): Player[] => {
    return dbPlayers
      .filter((p) => !p.is_host)
      .map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        answers: [],
        isHost: p.is_host,
        userId: p.user_id ?? '',
      }))
  }, [])

  const loadPlayers = useCallback(async () => {
    if (!session?.id) return
    try {
      const data = await getPlayers(session.id)
      setPlayers(mapDbPlayers(data))
    } catch (err) {
      console.error('Erreur lors du chargement des joueurs :', err)
    }
  }, [getPlayers, mapDbPlayers, session?.id])

  useEffect(() => {
    if (phase !== 'scoreboard') return
    void loadPlayers()
  }, [loadPlayers, phase])

  useEffect(() => {
    if (!session?.id || phase !== 'scoreboard') return
    const unsubscribe = subscribeToSession(session.id, () => {
      void loadPlayers()
    })
    return unsubscribe
  }, [loadPlayers, phase, session?.id, subscribeToSession])

  const handleAnswer = useCallback(async (answerId: string | null) => {
    if (!currentQuestion || !player || isSubmitting || hasSubmittedRef.current || phase !== 'question') return

    hasSubmittedRef.current = true
    setSelectedAnswer(answerId)
    setIsSubmitting(true)
    setSubmissionError(null)

    try {
      const result = await submitAnswer(player.id, currentQuestion.id, answerId, timeRemaining)
      const pointsEarned = result?.points_earned ?? 0
      setAnswerResult({
        isCorrect: result?.is_correct ?? false,
        pointsEarned,
        correctAnswerId: result?.correct_answer_id ?? null,
      })
      if (typeof result?.new_score === 'number') {
        setScore(result.new_score)
      } else {
        setScore(prev => prev + pointsEarned)
      }
    } catch (err) {
      console.error('Error submitting answer:', err)
      setAnswerResult(null)
      setSubmissionError('Impossible de valider la réponse pour le moment.')
    } finally {
      setIsSubmitting(false)
    }

  }, [currentQuestion, timeRemaining, player, submitAnswer, isSubmitting, phase])

  useEffect(() => {
    if (!player) return
    setScore(player.score)
  }, [player?.id, player?.score, player])

  useEffect(() => {
    if (!currentQuestion || phase !== 'question') return
    hasSubmittedRef.current = false
    setSelectedAnswer(null)
    setAnswerResult(null)
    setSubmissionError(null)
    setTimeRemaining(currentQuestion.timeLimit)
  }, [currentQuestion, phase])

  useEffect(() => {
    if (!currentQuestion || phase !== 'question') return
    const startTime = session?.questionStartedAt ?? session?.updatedAt ?? new Date()
    const tick = () => {
      const elapsedSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000)
      const remaining = Math.max(0, currentQuestion.timeLimit - elapsedSeconds)
      setTimeRemaining(remaining)
    }
    tick()
    const interval = setInterval(tick, 500)
    return () => clearInterval(interval)
  }, [currentQuestion, phase, session?.questionStartedAt, session?.updatedAt])

  useEffect(() => {
    if (!currentQuestion || phase !== 'question' || hasSubmittedRef.current) return
    if (timeRemaining === 0) {
      void handleAnswer(null)
    }
  }, [currentQuestion, timeRemaining, phase, handleAnswer])

  const rankedPlayers = useMemo(() => {
    return [...players].sort((a, b) => b.score - a.score)
  }, [players])

  if (!currentQuestion) return null

  const selectedAnswerText = selectedAnswer
    ? currentQuestion.answers.find((answer) => answer.id === selectedAnswer)?.text ?? null
    : null

  const correctAnswerText = answerResult?.correctAnswerId
    ? currentQuestion.answers.find((answer) => answer.id === answerResult.correctAnswerId)?.text ?? null
    : null
  const canAnswer = phase === 'question'

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-medium border border-white/20">
            {player?.name[0].toUpperCase() || '?'}
          </div>
          <span className="font-medium">{player?.name || 'Joueur'}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 border border-white/10">
            <CrownIcon className="w-5 h-5 text-[hsl(var(--answer-yellow))]" />
            <span className="font-medium">{score}</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 border border-white/10">
            <span className="text-sm text-white/60">Question</span>
            <span className="font-medium">{currentQuestionIndex + 1}/{quiz?.questions.length}</span>
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-3 mb-3">
          <StopWatchIcon className="w-6 h-6" />
          <span className={`text-3xl font-medium ${timeRemaining <= 5 ? 'text-[hsl(var(--answer-red))]' : ''}`}>
            {timeRemaining}s
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              timeRemaining <= 5 ? 'bg-[hsl(var(--answer-red))]' : 'bg-[hsl(var(--answer-green))]'
            }`}
            style={{ width: `${(timeRemaining / currentQuestion.timeLimit) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-medium leading-tight">
          {currentQuestion.text}
        </h2>
      </div>

      {/* Answers Grid */}
      <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
        {currentQuestion.answers.map((answer) => {
          const isSelected = selectedAnswer === answer.id
          const isCorrect = answerResult?.correctAnswerId === answer.id
          const canShowCorrect = showResult && answerResult !== null
          
          return (
            <button
              key={answer.id}
              onClick={() => canAnswer && handleAnswer(answer.id)}
              disabled={!canAnswer}
              className={`
                relative h-32 md:h-40 rounded-2xl font-medium text-xl md:text-2xl
                transition-all duration-300 transform hover:scale-105
                ${getAnswerBgClass(answer.color)}
                ${getAnswerShape(answer.color)}
                ${getAnswerColorClass(answer.color, isSelected, canShowCorrect, isCorrect)}
                ${canAnswer ? 'cursor-pointer shadow-lg hover:shadow-xl' : 'cursor-default'}
              `}
            >
              <span className="relative z-10 px-4">{answer.text}</span>
              
              {showResult && isCorrect && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Tick02Icon className="w-12 h-12 text-white/80" />
                </div>
              )}
              
              {showResult && isSelected && !isCorrect && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl">
                  <Cancel02Icon className="w-12 h-12 text-white/80" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Result Message */}
      {showResult && (
        <div className="text-center mt-8 space-y-4">
          {submissionError ? (
            <div className="inline-flex items-center gap-2 bg-destructive/10 text-destructive px-6 py-3 rounded-full font-medium text-lg">
              <Cancel02Icon className="w-6 h-6" />
              {submissionError}
            </div>
          ) : answerResult?.isCorrect ? (
            <div className="inline-flex items-center gap-2 bg-[hsl(var(--answer-green))] text-white px-6 py-3 rounded-full font-medium text-xl">
              <Tick02Icon className="w-6 h-6" />
              Bonne réponse ! +{answerResult.pointsEarned} pts
            </div>
          ) : selectedAnswer ? (
            <div className="inline-flex items-center gap-2 bg-[hsl(var(--answer-red))] text-white px-6 py-3 rounded-full font-medium text-xl">
              <Cancel02Icon className="w-6 h-6" />
              Mauvaise réponse
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-white/20 text-white px-6 py-3 rounded-full font-medium text-xl">
              <StopWatchIcon className="w-6 h-6" />
              Temps écoulé
            </div>
          )}

          {!submissionError && (
            <div className="text-sm text-white/70">
              {selectedAnswerText && (
                <p>
                  Votre réponse : <span className="text-white font-medium">{selectedAnswerText}</span>
                </p>
              )}
              {correctAnswerText && (
                <p>
                  Bonne réponse : <span className="text-white font-medium">{correctAnswerText}</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {phase === 'scoreboard' && (
        <div className="text-center mt-8">
          <div className="inline-flex items-center gap-2 bg-white/10 px-6 py-3 rounded-full text-white/80 text-lg mb-6">
            <CrownIcon className="w-5 h-5 text-[hsl(var(--answer-yellow))]" />
            Classement provisoire
          </div>
          {rankedPlayers.length === 0 ? (
            <p className="text-white/70 text-lg">Aucun joueur pour le moment.</p>
          ) : (
            <div className="max-w-xl mx-auto space-y-3">
              {rankedPlayers.map((rankedPlayer, index) => (
                <div
                  key={rankedPlayer.id}
                  className="flex items-center justify-between p-4 bg-white/10 rounded-xl border border-white/10 transition-all duration-500"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-medium">
                      {(rankedPlayer.name?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-white">{rankedPlayer.name}</p>
                      <p className="text-sm text-white/60">#{index + 1}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-medium text-white">{rankedPlayer.score}</p>
                    <p className="text-sm text-white/60">pts</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
