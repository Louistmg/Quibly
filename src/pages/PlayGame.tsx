import { useState, useEffect, useCallback, useRef } from 'react'
import { StopWatchIcon, CrownIcon, Tick02Icon, Cancel02Icon } from 'hugeicons-react'
import { GameSession, Quiz, Player, Question, Answer } from '@/types'
import { useSupabase } from '@/hooks/useSupabase'

interface PlayGameProps {
  session: GameSession | null
  quiz: Quiz | null
  player: Player | null
  onEnd: () => void
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

export function PlayGame({ quiz, player, onEnd }: PlayGameProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; pointsEarned: number; correctAnswerId: string | null } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { submitAnswer } = useSupabase()

  const currentQuestion: Question | undefined = quiz?.questions[currentQuestionIndex]
  
  // Initialize timeRemaining based on current question
  const [timeRemaining, setTimeRemaining] = useState(() => 
    currentQuestion?.timeLimit ?? 0
  )
  
  // Track previous question to detect changes
  const prevQuestionRef = useRef<Question | undefined>(undefined)

  const handleAnswer = useCallback(async (answerId: string | null) => {
    if (!currentQuestion || showResult || !player || isSubmitting) return

    setSelectedAnswer(answerId)
    setShowResult(true)
    setIsSubmitting(true)

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
      setAnswerResult({
        isCorrect: false,
        pointsEarned: 0,
        correctAnswerId: null,
      })
    } finally {
      setIsSubmitting(false)
    }

    setTimeout(() => {
      if (currentQuestionIndex < (quiz?.questions.length || 0) - 1) {
        setCurrentQuestionIndex(prev => prev + 1)
      } else {
        onEnd()
      }
    }, 2500)
  }, [currentQuestion, currentQuestionIndex, quiz, timeRemaining, onEnd, showResult, player, submitAnswer, isSubmitting])

  // Reset state when question changes using a microtask to avoid sync setState
  useEffect(() => {
    if (currentQuestion && currentQuestion.id !== prevQuestionRef.current?.id) {
      prevQuestionRef.current = currentQuestion
      // Use Promise.resolve to defer state updates to next tick
      Promise.resolve().then(() => {
        setTimeRemaining(currentQuestion.timeLimit)
        setSelectedAnswer(null)
        setAnswerResult(null)
        setShowResult(false)
      })
    }
  }, [currentQuestion])

  useEffect(() => {
    if (timeRemaining > 0 && !showResult && !selectedAnswer) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (timeRemaining === 0 && !showResult && !selectedAnswer) {
      // Use microtask to avoid sync setState in effect
      Promise.resolve().then(() => {
        handleAnswer(null)
      })
    }
  }, [timeRemaining, showResult, selectedAnswer, handleAnswer])

  if (!currentQuestion) return null

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
              onClick={() => !showResult && handleAnswer(answer.id)}
              disabled={showResult}
              className={`
                relative h-32 md:h-40 rounded-2xl font-medium text-xl md:text-2xl
                transition-all duration-300 transform hover:scale-105
                ${getAnswerBgClass(answer.color)}
                ${getAnswerShape(answer.color)}
                ${getAnswerColorClass(answer.color, isSelected, canShowCorrect, isCorrect)}
                ${showResult ? 'cursor-default' : 'cursor-pointer shadow-lg hover:shadow-xl'}
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
        <div className="text-center mt-8">
          {answerResult?.isCorrect ? (
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
        </div>
      )}
    </div>
  )
}
