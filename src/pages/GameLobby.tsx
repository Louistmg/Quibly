import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button as CustomButton } from '@/components/ui/custom-button'
import { GameSession, Player, Quiz } from '@/types'
import { ArrowLeft01Icon, UserGroupIcon, PlayIcon, Copy01Icon, Tick02Icon } from 'hugeicons-react'

interface GameLobbyProps {
  session: GameSession | null
  player: Player | null
  quiz: Quiz | null
  onStart: () => void
  onBack: () => void
  isHost?: boolean
}

export function GameLobby({ session, player, quiz, onStart, onBack, isHost }: GameLobbyProps) {
  const [copied, setCopied] = useState(false)
  
  const players = useMemo(() => {
    const defaultPlayers = [
      { id: '1', name: 'Marie', score: 0, answers: [] },
      { id: '2', name: 'Lucas', score: 0, answers: [] },
      { id: '3', name: 'Emma', score: 0, answers: [] },
    ] as Player[]
    
    if (player && !defaultPlayers.find(p => p.id === player.id)) {
      return [...defaultPlayers, player]
    }
    return defaultPlayers
  }, [player])

  const handleCopyCode = () => {
    if (session?.code) {
      navigator.clipboard.writeText(session.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const gameCode = session?.code || 'ABC123'

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-4xl">
        <Button variant="ghost" onClick={onBack} className="mb-8 hover:bg-muted">
          <ArrowLeft01Icon className="w-5 h-5 mr-2" />
          Retour
        </Button>

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
              <div className="grid grid-cols-2 gap-3">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border"
                  >
                    <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center font-medium">
                      {p.name[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-foreground">{p.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-lg font-medium">Code de la partie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-medium tracking-wider text-[hsl(var(--answer-blue))] mb-3">
                  {gameCode}
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
              >
                {copied ? 'Code copié' : 'Copier le code'}
              </CustomButton>

              {(isHost ?? !player) && (
                <CustomButton
                  variant="primary"
                  onClick={onStart}
                  className="w-full bg-[hsl(var(--answer-green))] text-white hover:bg-[hsl(var(--answer-green))]/90"
                  icon={<PlayIcon className="w-5 h-5" />}
                >
                  Lancer la partie
                </CustomButton>
              )}

              {!(isHost ?? !player) && (
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
