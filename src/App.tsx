import { useEffect, useState } from 'react'
import { GamePhase, Quiz, GameSession, Player } from '@/types'
import { Home } from '@/pages/Home'
import { CreateQuiz } from '@/pages/CreateQuiz'
import { JoinGame } from '@/pages/JoinGame'
import { GameLobby } from '@/pages/GameLobby'
import { PlayGame } from '@/pages/PlayGame'
import { Results } from '@/pages/Results'
import { useSupabase } from '@/hooks/useSupabase'
import './App.css'

function App() {
  const [phase, setPhase] = useState<GamePhase>('home')
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null)
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  
  const { createQuiz, createGameSession, joinGame, updateSessionStatus, getQuizByCode, getWaitingSessionByCode, ensureAuth, loading, error } = useSupabase()

  useEffect(() => {
    ensureAuth().catch((err: unknown) => {
      console.error('Auth error:', err)
    })
  }, [ensureAuth])

  const handleCreateQuiz = async (quiz: Omit<Quiz, 'id' | 'createdAt' | 'code'>) => {
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
      
      const newQuiz: Quiz = {
        ...quiz,
        id: dbQuiz.id,
        createdAt: new Date(dbQuiz.created_at),
        code: dbQuiz.code,
      }
      setCurrentQuiz(newQuiz)
      
      const dbSession = await createGameSession(dbQuiz.id)
      
      const session: GameSession = {
        id: dbSession.id,
        quizId: dbSession.quiz_id,
        code: dbSession.code,
        status: 'waiting',
        players: [],
        currentQuestionIndex: dbSession.current_question_index ?? 0,
        hostId: dbSession.host_id,
      }
      setCurrentSession(session)
      
      const hostPlayer = await joinGame(dbSession.id, 'Host', true)
      setCurrentPlayer({
        id: hostPlayer.id,
        name: hostPlayer.name,
        score: hostPlayer.score,
        answers: [],
        isHost: hostPlayer.is_host,
        userId: hostPlayer.user_id ?? authUserId,
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

      if (!existingSession) {
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
      
      setPhase('lobby')
    } catch (err) {
      console.error('Error joining game:', err)
      alert('Erreur lors de la connexion à la partie. Veuillez vérifier le code.')
    }
  }

  const handleStartGame = async () => {
    if (currentSession) {
      try {
        await updateSessionStatus(currentSession.id, 'playing')
        setCurrentSession({ ...currentSession, status: 'playing' })
        setPhase('play')
      } catch (err) {
        console.error('Error starting game:', err)
      }
    }
  }

  const handleGameEnd = async () => {
    if (currentSession) {
      try {
        await updateSessionStatus(currentSession.id, 'finished')
        setCurrentSession({ ...currentSession, status: 'finished' })
      } catch (err) {
        console.error('Error ending game:', err)
      }
    }
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
            onBack={() => setPhase('home')}
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
            onBack={() => setPhase('home')}
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
