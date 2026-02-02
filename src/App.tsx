import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { GamePhase, Quiz, GameSession, Player } from '@/types'
import { useSupabase } from '@/hooks/useSupabase'
import type { Quiz as DbQuiz, Question as DbQuestion, PublicAnswer as DbPublicAnswer, GameSession as DbGameSession, Player as DbPlayer } from '@/lib/supabase'
import './App.css'

type PublicQuizPayload = DbQuiz & { questions: (DbQuestion & { answers: DbPublicAnswer[] })[] }

type StoredSession = {
  sessionId: string
  quizCode: string
  role: 'host' | 'player'
  playerId?: string
}

const Home = lazy(() => import('@/pages/Home').then((module) => ({ default: module.Home })))
const CreateQuiz = lazy(() => import('@/pages/CreateQuiz').then((module) => ({ default: module.CreateQuiz })))
const JoinGame = lazy(() => import('@/pages/JoinGame').then((module) => ({ default: module.JoinGame })))
const GameLobby = lazy(() => import('@/pages/GameLobby').then((module) => ({ default: module.GameLobby })))
const HostGame = lazy(() => import('@/pages/HostGame').then((module) => ({ default: module.HostGame })))
const PlayGame = lazy(() => import('@/pages/PlayGame').then((module) => ({ default: module.PlayGame })))
const Results = lazy(() => import('@/pages/Results').then((module) => ({ default: module.Results })))

const ACTIVE_SESSION_KEY = 'quibly:active-session'
const CREATE_QUIZ_DRAFT_KEY = 'quibly:create-quiz-draft'

const normalizeStoredSession = (value: unknown): StoredSession | null => {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const sessionId = record.sessionId
  const quizCode = record.quizCode
  const role = record.role
  const playerId = record.playerId

  if (typeof sessionId !== 'string' || typeof quizCode !== 'string') return null

  if (role === 'host' || role === 'player') {
    return {
      sessionId,
      quizCode,
      role,
      playerId: typeof playerId === 'string' ? playerId : undefined,
    }
  }

  const inferredRole: StoredSession['role'] = typeof playerId === 'string' ? 'player' : 'host'
  return {
    sessionId,
    quizCode,
    role: inferredRole,
    playerId: typeof playerId === 'string' ? playerId : undefined,
  }
}

const readStoredSession = (): StoredSession | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(ACTIVE_SESSION_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return normalizeStoredSession(parsed)
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

const clearCreateQuizDraft = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(CREATE_QUIZ_DRAFT_KEY)
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
  phase: sessionData.phase ?? 'question',
  players: [],
  currentQuestionIndex: sessionData.current_question_index ?? 0,
  hostId: sessionData.host_id,
  questionStartedAt: sessionData.question_started_at ? new Date(sessionData.question_started_at) : null,
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
  const [isHost, setIsHost] = useState(false)
  const [prefillJoinCode, setPrefillJoinCode] = useState<string | null>(null)
  
  const { createQuiz, createGameSession, joinGame, updateSessionState, getQuizByCode, getWaitingSessionByCode, getSessionById, getPlayerById, getPlayerBySession, removePlayer, deleteGameSession, subscribeToGameSession, ensureAuth, loading, error } = useSupabase()

  const resetSessionState = useCallback(() => {
    clearStoredSession()
    setCurrentQuiz(null)
    setCurrentSession(null)
    setCurrentPlayer(null)
    setIsHost(false)
    setPrefillJoinCode(null)
  }, [])

  const clearActiveSession = useCallback(() => {
    resetSessionState()
    setPhase('home')
  }, [resetSessionState])

  const handleQuit = useCallback(async () => {
    const sessionId = currentSession?.id
    const playerId = currentPlayer?.id
    const isCurrentHost = isHost

    clearActiveSession()

    if (isCurrentHost && sessionId) {
      try {
        await deleteGameSession(sessionId)
      } catch (err) {
        console.error('Erreur lors de la suppression de la partie :', err)
      }
    } else if (playerId) {
      try {
        await removePlayer(playerId)
      } catch (err) {
        console.error('Erreur lors de la suppression du joueur :', err)
      }
    }
  }, [clearActiveSession, currentPlayer?.id, currentSession?.id, deleteGameSession, isHost, removePlayer])

  const handleStartCreate = useCallback(() => {
    resetSessionState()
    setPhase('create')
  }, [resetSessionState])

  const handleStartJoin = useCallback(() => {
    resetSessionState()
    setPhase('join')
  }, [resetSessionState])

  useEffect(() => {
    ensureAuth().catch((err: unknown) => {
      console.error('Auth error:', err)
    })
  }, [ensureAuth])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    const isIos = /iP(hone|od|ad)/.test(window.navigator.userAgent)
      || (window.navigator.userAgent.includes('Mac') && 'ontouchend' in document)
    const forceScrollTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
    forceScrollTop()
    const frame = window.requestAnimationFrame(forceScrollTop)
    const timeout = window.setTimeout(forceScrollTop, 120)
    const longerTimeout = window.setTimeout(forceScrollTop, 400)
    const viewport = window.visualViewport
    let guardTimeout: number | null = null
    const handleViewportChange = () => forceScrollTop()
    if (isIos && viewport) {
      viewport.addEventListener('resize', handleViewportChange)
      viewport.addEventListener('scroll', handleViewportChange)
      window.addEventListener('orientationchange', handleViewportChange)
      guardTimeout = window.setTimeout(() => {
        viewport.removeEventListener('resize', handleViewportChange)
        viewport.removeEventListener('scroll', handleViewportChange)
        window.removeEventListener('orientationchange', handleViewportChange)
      }, 1500)
    }
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
      window.clearTimeout(longerTimeout)
      if (guardTimeout) {
        window.clearTimeout(guardTimeout)
      }
      if (isIos && viewport) {
        viewport.removeEventListener('resize', handleViewportChange)
        viewport.removeEventListener('scroll', handleViewportChange)
        window.removeEventListener('orientationchange', handleViewportChange)
      }
    }
  }, [phase])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!currentSession?.id || !currentPlayer?.id || isHost) return
    let hasHandledExit = false
    const handleExit = () => {
      if (hasHandledExit) return
      hasHandledExit = true
      clearStoredSession()
      void removePlayer(currentPlayer.id)
    }
    window.addEventListener('beforeunload', handleExit)
    window.addEventListener('pagehide', handleExit)
    return () => {
      window.removeEventListener('beforeunload', handleExit)
      window.removeEventListener('pagehide', handleExit)
    }
  }, [currentPlayer?.id, currentSession?.id, isHost, removePlayer])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (readStoredSession()) return

    const url = new URL(window.location.href)
    const rawCode = url.searchParams.get('code')
    if (!rawCode) return

    const normalizedCode = rawCode.trim().toUpperCase().slice(0, 6)
    if (!normalizedCode) return

    setPrefillJoinCode(normalizedCode)
    setPhase('join')
  }, [])

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

        const isHostRole = stored.role === 'host' || sessionData.host_id === authUserId
        setIsHost(isHostRole)

        let playerData: DbPlayer | null = null
        if (!isHostRole) {
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
        }

        if (!isActive) return

        setCurrentQuiz(mapQuizFromDb(quizData))
        setCurrentSession(mapSessionFromDb(sessionData))
        setCurrentPlayer(playerData ? mapPlayerFromDb(playerData, authUserId) : null)

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
          phase: updated.phase ?? prev.phase,
          currentQuestionIndex: typeof updated.current_question_index === 'number'
            ? updated.current_question_index
            : prev.currentQuestionIndex,
          questionStartedAt: updated.question_started_at
            ? new Date(updated.question_started_at)
            : prev.questionStartedAt ?? null,
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

  useEffect(() => {
    if (!currentSession?.id) return
    let isActive = true

    const syncSession = async () => {
      try {
        const dbSession = await getSessionById(currentSession.id)
        if (!dbSession || !isActive) return
        const nextSession = mapSessionFromDb(dbSession)
        setCurrentSession(nextSession)

        if (dbSession.status === 'playing') {
          setPhase('play')
        } else if (dbSession.status === 'finished') {
          setPhase('results')
        } else {
          setPhase('lobby')
        }
      } catch (err) {
        console.error('Error syncing session:', err)
      }
    }

    void syncSession()
    const interval = setInterval(syncSession, 3000)

    return () => {
      isActive = false
      clearInterval(interval)
    }
  }, [currentSession?.id, getSessionById])

  const handleCreateQuiz = async (quiz: Omit<Quiz, 'id' | 'createdAt' | 'code'>) => {
    try {
      await ensureAuth()
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
        phase: dbSession.phase ?? 'question',
        players: [],
        currentQuestionIndex: dbSession.current_question_index ?? 0,
        hostId: dbSession.host_id,
        questionStartedAt: dbSession.question_started_at ? new Date(dbSession.question_started_at) : null,
        startedAt: dbSession.started_at ? new Date(dbSession.started_at) : null,
        endedAt: dbSession.ended_at ? new Date(dbSession.ended_at) : null,
        updatedAt: dbSession.updated_at ? new Date(dbSession.updated_at) : null,
      }
      setCurrentSession(session)

      setCurrentPlayer(null)
      setIsHost(true)
      writeStoredSession({
        sessionId: dbSession.id,
        quizCode: dbSession.code,
        role: 'host',
      })

      clearCreateQuizDraft()
      setPhase('lobby')
    } catch (err) {
      console.error('Error creating quiz:', err)
      alert('Erreur lors de la création du quiz. Veuillez réessayer.')
    }
  }

  const handleJoinGame = async (code: string, playerName: string) => {
    try {
      const authUserId = await ensureAuth()
      setIsHost(false)
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
        phase: existingSession.phase ?? 'question',
        players: [],
        currentQuestionIndex: existingSession.current_question_index,
        hostId: existingSession.host_id,
        questionStartedAt: existingSession.question_started_at ? new Date(existingSession.question_started_at) : null,
        startedAt: existingSession.started_at ? new Date(existingSession.started_at) : null,
        endedAt: existingSession.ended_at ? new Date(existingSession.ended_at) : null,
        updatedAt: existingSession.updated_at ? new Date(existingSession.updated_at) : null,
      }
      setCurrentSession(session)
      
      const player = await joinGame(session.id, playerName)
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
        role: 'player',
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
          phase: 'question',
          questionStartedAt: now,
          startedAt: now,
        })
        setCurrentSession({
          ...currentSession,
          status: 'playing',
          phase: 'question',
          currentQuestionIndex: 0,
          questionStartedAt: new Date(now),
          startedAt: new Date(now),
          updatedAt: new Date(now),
        })
        setPhase('play')
      } catch (err) {
        console.error('Error starting game:', err)
      }
    }
  }

  const renderPhase = () => {
    switch (phase) {
      case 'home':
        return (
          <Home
            onCreate={handleStartCreate}
            onJoin={handleStartJoin}
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
            initialCode={prefillJoinCode ?? undefined}
          />
        )
      case 'lobby':
        return (
          <GameLobby
            session={currentSession}
            quiz={currentQuiz}
            onStart={handleStartGame}
            onBack={handleQuit}
            isHost={isHost}
          />
        )
      case 'play':
        return isHost ? (
          <HostGame
            session={currentSession}
            quiz={currentQuiz}
            onQuit={handleQuit}
          />
        ) : (
          <PlayGame
            session={currentSession}
            quiz={currentQuiz}
            player={currentPlayer}
          />
        )
      case 'results':
        return (
          <Results
            session={currentSession}
            onBack={handleQuit}
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
      <Suspense
        fallback={
          <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
            Chargement...
          </div>
        }
      >
        {renderPhase()}
      </Suspense>
    </div>
  )
}

export default App
