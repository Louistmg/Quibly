import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button as CustomButton } from '@/components/ui/custom-button'
import type { GameSession, Player as UiPlayer, Quiz } from '@/types'
import type { Player as DbPlayer } from '@/lib/supabase'
import { useSupabase } from '@/hooks/useSupabase'
import { ArrowLeft01Icon, UserGroupIcon, PlayIcon, Copy01Icon, Tick02Icon } from 'hugeicons-react'

interface GameLobbyProps {
  session: GameSession | null
  quiz: Quiz | null
  onStart: () => void
  onBack: () => void
  isHost?: boolean
}

export function GameLobby({ session, quiz, onStart, onBack, isHost }: GameLobbyProps) {
  const [copied, setCopied] = useState(false)
  const [players, setPlayers] = useState<UiPlayer[]>([])
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false)
  const { getPlayers, subscribeToSession } = useSupabase()

  const mapDbPlayers = useCallback((dbPlayers: DbPlayer[]): UiPlayer[] => {
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
    setIsLoadingPlayers(true)
    try {
      const data = await getPlayers(session.id)
      setPlayers(mapDbPlayers(data))
    } catch (err) {
      console.error('Erreur lors du chargement des joueurs :', err)
    } finally {
      setIsLoadingPlayers(false)
    }
  }, [getPlayers, mapDbPlayers, session?.id])

  useEffect(() => {
    void loadPlayers()
  }, [loadPlayers])

  useEffect(() => {
    if (!session?.id) return
    const unsubscribe = subscribeToSession(session.id, () => {
      void loadPlayers()
    })
    return unsubscribe
  }, [loadPlayers, session?.id, subscribeToSession])

  const handleCopyCode = () => {
    if (session?.code) {
      navigator.clipboard.writeText(session.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const gameCode = session?.code ?? ''

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-4xl">
        <CustomButton
          variant="secondary"
          onClick={onBack}
          className="mb-8"
          icon={<ArrowLeft01Icon className="w-5 h-5" />}
        >
          Quitter la partie
        </CustomButton>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-medium text-foreground mb-2">
            {quiz?.title || 'Salle d\'attente'}
          </h1>
          <p className="text-muted-foreground">
            {quiz?.description || 'En attente de joueurs...'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border border-border shadow-sm">
            <CardHeader className="text-center pb-4">
              <CardTitle className="flex items-center justify-center gap-2 text-lg font-medium">
                <UserGroupIcon className="w-5 h-5" />
                Joueurs ({players.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPlayers ? (
                <p className="text-sm text-muted-foreground">Chargement des joueurs...</p>
              ) : players.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun joueur pour le moment.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border min-w-0"
                    >
                      <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center font-medium">
                        {(p.name?.[0] ?? '?').toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground break-words">{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-lg font-medium">Code de la partie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-medium tracking-wider text-[hsl(var(--answer-blue))] mb-3">
                  {gameCode || '—'}
                </div>
                <p className="text-sm text-muted-foreground">
                  Partagez ce code avec vos amis pour qu'ils rejoignent
                </p>
              </div>

              <CustomButton
                variant="secondary"
                onClick={handleCopyCode}
                className="w-full"
                icon={copied ? <Tick02Icon className="w-5 h-5" /> : <Copy01Icon className="w-5 h-5" />}
                disabled={!gameCode}
              >
                {copied ? 'Code copié' : 'Copier le code'}
              </CustomButton>

              {isHost && (
                <CustomButton
                  variant="primary"
                  onClick={onStart}
                  className="w-full bg-[hsl(var(--answer-green))] text-white hover:bg-[hsl(var(--answer-green))]/90"
                  icon={<PlayIcon className="w-5 h-5" />}
                >
                  Lancer la partie
                </CustomButton>
              )}

              {!isHost && (
                <div className="text-center p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="font-medium text-foreground">En attente du lancement...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    L'hôte démarrera la partie bientôt
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
