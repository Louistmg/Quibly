import { useCallback, useEffect, useState } from 'react'
import { GamePhase, Quiz, GameSession, Player } from '@/types'
import { Home } from '@/pages/Home'
import { CreateQuiz } from '@/pages/CreateQuiz'
import { JoinGame } from '@/pages/JoinGame'
import { GameLobby } from '@/pages/GameLobby'
import { PlayGame } from '@/pages/PlayGame'
import { Results } from '@/pages/Results'
import { useSupabase } from '@/hooks/useSupabase'
import type { Quiz as DbQuiz, Question as DbQuestion, PublicAnswer as DbPublicAnswer, GameSession as DbGameSession, Player as DbPlayer } from '@/lib/supabase'
import './App.css'

type PublicQuizPayload = DbQuiz & { questions: (DbQuestion & { answers: DbPublicAnswer[] })[] }

type StoredSession = {
  sessionId: string
  quizCode: string
  playerId?: string
}

const ACTIVE_SESSION_KEY = 'quibly:active-session'

const isStoredSession = (value: unknown): value is StoredSession => {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  const sessionId = record.sessionId
  const quizCode = record.quizCode
  const playerId = record.playerId
  return typeof sessionId === 'string'
    && typeof quizCode === 'string'
    && (typeof playerId === 'string' || typeof playerId === 'undefined')
}

const readStoredSession = (): StoredSession | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(ACTIVE_SESSION_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isStoredSession(parsed) ? parsed : null
  } catch {
    return null
  }
}

const writeStoredSession = (value: StoredSession) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(value))
}

const clearStoredSession = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(ACTIVE_SESSION_KEY)
}

const mapQuizFromDb = (quizData: PublicQuizPayload): Quiz => ({
  id: quizData.id,
  title: quizData.title,
  description: quizData.description || '',
  code: quizData.code,
  createdAt: new Date(quizData.created_at),
  questions: quizData.questions.map(q => ({
    id: q.id,
    text: q.text,
    timeLimit: q.time_limit,
    points: q.points,
    answers: q.answers.map(a => ({
      id: a.id,
      text: a.text,
      color: a.color,
    })),
  })),
})

const mapSessionFromDb = (sessionData: DbGameSession): GameSession => ({
  id: sessionData.id,
  quizId: sessionData.quiz_id,
  code: sessionData.code,
  status: sessionData.status,
  players: [],
  currentQuestionIndex: sessionData.current_question_index ?? 0,
  hostId: sessionData.host_id,
  startedAt: sessionData.started_at ? new Date(sessionData.started_at) : null,
  endedAt: sessionData.ended_at ? new Date(sessionData.ended_at) : null,
  updatedAt: sessionData.updated_at ? new Date(sessionData.updated_at) : null,
})

const mapPlayerFromDb = (playerData: DbPlayer, fallbackUserId: string): Player => ({
  id: playerData.id,
  name: playerData.name,
  score: playerData.score,
  answers: [],
  isHost: playerData.is_host,
  userId: playerData.user_id ?? fallbackUserId,
})

function App() {
  const [phase, setPhase] = useState<GamePhase>('home')
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null)
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  
  const { createQuiz, createGameSession, joinGame, updateSessionState, getQuizByCode, getWaitingSessionByCode, getSessionById, getPlayerById, getPlayerBySession, subscribeToGameSession, ensureAuth, loading, error } = useSupabase()

  const clearActiveSession = useCallback(() => {
    clearStoredSession()
    setCurrentQuiz(null)
    setCurrentSession(null)
    setCurrentPlayer(null)
    setPhase('home')
  }, [])

  useEffect(() => {
    ensureAuth().catch((err: unknown) => {
      console.error('Auth error:', err)
    })
  }, [ensureAuth])

  useEffect(() => {
    let isActive = true

    const restoreSession = async () => {
      const stored = readStoredSession()
      if (!stored) return

      try {
        const authUserId = await ensureAuth()
        const [sessionData, quizData] = await Promise.all([
          getSessionById(stored.sessionId),
          getQuizByCode(stored.quizCode),
        ])

        if (!sessionData || !quizData) {
          if (isActive) clearActiveSession()
          return
        }

        let playerData: DbPlayer | null = null
        if (stored.playerId) {
          playerData = await getPlayerById(stored.playerId)
        }
        if (!playerData) {
          playerData = await getPlayerBySession(stored.sessionId)
        }

        if (!playerData) {
          if (isActive) clearActiveSession()
          return
        }

        if (!isActive) return

        setCurrentQuiz(mapQuizFromDb(quizData))
        setCurrentSession(mapSessionFromDb(sessionData))
        setCurrentPlayer(mapPlayerFromDb(playerData, authUserId))

        const nextPhase: GamePhase = sessionData.status === 'playing'
          ? 'play'
          : sessionData.status === 'finished'
            ? 'results'
            : 'lobby'

        setPhase(nextPhase)
      } catch (err) {
        console.error('Error restoring session:', err)
        if (isActive) clearActiveSession()
      }
    }

    void restoreSession()
    return () => {
      isActive = false
    }
  }, [clearActiveSession, ensureAuth, getPlayerById, getPlayerBySession, getQuizByCode, getSessionById])

  useEffect(() => {
    if (!currentSession?.id) return
    const unsubscribe = subscribeToGameSession(currentSession.id, (payload) => {
      const updated = payload.new as Partial<DbGameSession>
      if (!updated || typeof updated !== 'object') return

      setCurrentSession((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          status: updated.status ?? prev.status,
          currentQuestionIndex: typeof updated.current_question_index === 'number'
            ? updated.current_question_index
            : prev.currentQuestionIndex,
          startedAt: updated.started_at ? new Date(updated.started_at) : prev.startedAt ?? null,
          endedAt: updated.ended_at ? new Date(updated.ended_at) : prev.endedAt ?? null,
          updatedAt: updated.updated_at ? new Date(updated.updated_at) : prev.updatedAt ?? null,
        }
      })

      if (updated.status === 'playing') {
        setPhase('play')
      } else if (updated.status === 'finished') {
        setPhase('results')
      } else if (updated.status === 'waiting') {
        setPhase('lobby')
      }
    })

    return unsubscribe
  }, [currentSession?.id, subscribeToGameSession])

  const handleCreateQuiz = async (quiz: Omit<Quiz, 'id' | 'createdAt' | 'code'>, hostName: string) => {
    try {
      const authUserId = await ensureAuth()
      
      const questionsForDb = quiz.questions.map(q => ({
        text: q.text,
        time_limit: q.timeLimit,
        points: q.points,
        answers: q.answers.map(a => ({
          text: a.text,
          is_correct: a.isCorrect ?? false,
          color: a.color
        }))
      }))
      
      const dbQuiz = await createQuiz(quiz.title, quiz.description || '', questionsForDb)
      
      const freshQuiz = await getQuizByCode(dbQuiz.code)
      if (!freshQuiz) {
        throw new Error('Quiz introuvable après création.')
      }
      setCurrentQuiz(mapQuizFromDb(freshQuiz))
      
      const dbSession = await createGameSession(dbQuiz.id)
      
      const session: GameSession = {
        id: dbSession.id,
        quizId: dbSession.quiz_id,
        code: dbSession.code,
        status: 'waiting',
        players: [],
        currentQuestionIndex: dbSession.current_question_index ?? 0,
        hostId: dbSession.host_id,
        startedAt: dbSession.started_at ? new Date(dbSession.started_at) : null,
        endedAt: dbSession.ended_at ? new Date(dbSession.ended_at) : null,
        updatedAt: dbSession.updated_at ? new Date(dbSession.updated_at) : null,
      }
      setCurrentSession(session)
      
      const hostPlayer = await joinGame(dbSession.id, hostName, true)
      setCurrentPlayer({
        id: hostPlayer.id,
        name: hostPlayer.name,
        score: hostPlayer.score,
        answers: [],
        isHost: hostPlayer.is_host,
        userId: hostPlayer.user_id ?? authUserId,
      })

      writeStoredSession({
        sessionId: dbSession.id,
        playerId: hostPlayer.id,
        quizCode: dbSession.code,
      })
      
      setPhase('lobby')
    } catch (err) {
      console.error('Error creating quiz:', err)
      alert('Erreur lors de la création du quiz. Veuillez réessayer.')
    }
  }

  const handleJoinGame = async (code: string, playerName: string) => {
    try {
      const authUserId = await ensureAuth()
      const quizData = await getQuizByCode(code)
      
      if (!quizData) {
        alert('Code de partie invalide')
        return
      }
      
      const quiz: Quiz = {
        id: quizData.id,
        title: quizData.title,
        description: quizData.description || '',
        code: quizData.code,
        createdAt: new Date(quizData.created_at),
        questions: quizData.questions.map(q => ({
          id: q.id,
          text: q.text,
          timeLimit: q.time_limit,
          points: q.points,
          answers: q.answers.map(a => ({
            id: a.id,
            text: a.text,
            color: a.color,
          })),
        })),
      }
      setCurrentQuiz(quiz)
      
      const existingSession = await getWaitingSessionByCode(code)

      if (!existingSession || !existingSession.id) {
        alert('Aucune partie en attente pour ce code')
        return
      }

      const session: GameSession = {
        id: existingSession.id,
        quizId: existingSession.quiz_id,
        code: existingSession.code,
        status: existingSession.status,
        players: [],
        currentQuestionIndex: existingSession.current_question_index,
        hostId: existingSession.host_id,
        startedAt: existingSession.started_at ? new Date(existingSession.started_at) : null,
        endedAt: existingSession.ended_at ? new Date(existingSession.ended_at) : null,
        updatedAt: existingSession.updated_at ? new Date(existingSession.updated_at) : null,
      }
      setCurrentSession(session)
      
      const player = await joinGame(session.id, playerName, false)
      setCurrentPlayer({
        id: player.id,
        name: player.name,
        score: player.score,
        answers: [],
        isHost: player.is_host,
        userId: player.user_id ?? authUserId,
      })

      writeStoredSession({
        sessionId: session.id,
        playerId: player.id,
        quizCode: session.code,
      })
      
      setPhase('lobby')
    } catch (err) {
      console.error('Error joining game:', err)
      alert('Erreur lors de la connexion à la partie. Veuillez vérifier le code.')
    }
  }

  const handleStartGame = async () => {
    if (currentSession) {
      try {
        const now = new Date().toISOString()
        await updateSessionState(currentSession.id, {
          status: 'playing',
          currentQuestionIndex: 0,
          startedAt: now,
        })
        setCurrentSession({
          ...currentSession,
          status: 'playing',
          currentQuestionIndex: 0,
          startedAt: new Date(now),
          updatedAt: new Date(now),
        })
        setPhase('play')
      } catch (err) {
        console.error('Error starting game:', err)
      }
    }
  }

  const handleGameEnd = async () => {
    setPhase('results')
  }

  const renderPhase = () => {
    switch (phase) {
      case 'home':
        return (
          <Home
            onCreate={() => setPhase('create')}
            onJoin={() => setPhase('join')}
          />
        )
      case 'create':
        return (
          <CreateQuiz
            onSubmit={handleCreateQuiz}
            onBack={() => setPhase('home')}
            isLoading={loading}
          />
        )
      case 'join':
        return (
          <JoinGame
            onJoin={handleJoinGame}
            onBack={() => setPhase('home')}
            isLoading={loading}
          />
        )
      case 'lobby':
        return (
          <GameLobby
            session={currentSession}
            quiz={currentQuiz}
            onStart={handleStartGame}
            onBack={clearActiveSession}
            isHost={currentPlayer?.isHost ?? false}
          />
        )
      case 'play':
        return (
          <PlayGame
            session={currentSession}
            quiz={currentQuiz}
            player={currentPlayer}
            onEnd={handleGameEnd}
          />
        )
      case 'results':
        return (
          <Results
            session={currentSession}
            onBack={clearActiveSession}
          />
        )
      default:
        return null
    }
  }

  if (error) {
    console.error('Supabase error:', error)
  }

  return (
    <div className="min-h-screen bg-background">
      {renderPhase()}
    </div>
  )
}

export default App
