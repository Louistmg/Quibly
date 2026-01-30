import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button as CustomButton } from '@/components/ui/custom-button'
import { GameSession } from '@/types'
import { CrownIcon, Medal01Icon, ArrowLeft01Icon, StarsIcon } from 'hugeicons-react'

interface ResultsProps {
  session: GameSession | null
  onBack: () => void
}

const mockResults = [
  { id: '2', name: 'Lucas', score: 1250, rank: 1 },
  { id: '1', name: 'Marie', score: 1100, rank: 2 },
  { id: '3', name: 'Emma', score: 950, rank: 3 },
  { id: '4', name: 'Thomas', score: 800, rank: 4 },
]

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <CrownIcon className="w-7 h-7 text-[hsl(var(--answer-yellow))]" />
    case 2:
      return <Medal01Icon className="w-7 h-7 text-gray-400" />
    case 3:
      return <Medal01Icon className="w-7 h-7 text-amber-700" />
    default:
      return <span className="text-lg font-medium text-muted-foreground">#{rank}</span>
  }
}

const getRankStyle = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-[hsl(var(--answer-yellow))]/10 border-[hsl(var(--answer-yellow))]'
    case 2:
      return 'bg-gray-100 border-gray-300'
    case 3:
      return 'bg-amber-50 border-amber-200'
    default:
      return 'bg-muted/50 border-border'
  }
}

export function Results({ onBack }: ResultsProps) {
  const winner = mockResults[0]

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-2xl">
        <Button variant="ghost" onClick={onBack} className="mb-8 hover:bg-muted">
          <ArrowLeft01Icon className="w-5 h-5 mr-2" />
          Retour à l'accueil
        </Button>

        {/* Winner Banner */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-xl bg-[hsl(var(--answer-yellow))] flex items-center justify-center">
              <CrownIcon className="w-8 h-8 text-white" />
            </div>
            <StarsIcon className="w-6 h-6 text-[hsl(var(--answer-yellow))]" />
          </div>
          <h1 className="text-3xl font-medium text-foreground mb-2">Partie terminée</h1>
          <p className="text-lg text-muted-foreground">
            Félicitations à <span className="font-medium text-foreground">{winner.name}</span>
          </p>
        </div>

        {/* Podium */}
        <Card className="mb-8 border border-border shadow-sm overflow-hidden">
          <CardHeader className="text-center bg-muted/50 border-b border-border">
              <CardTitle className="text-xl font-medium flex items-center justify-center gap-2">
                <CrownIcon className="w-5 h-5" />
                Classement final
              </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {mockResults.map((player) => (
              <div
                key={player.id}
                className={`
                  flex items-center gap-4 p-4 border-b last:border-b-0
                  ${getRankStyle(player.rank)}
                  ${player.rank <= 3 ? 'border-l-4' : 'border-l-4 border-l-transparent'}
                `}
              >
                <div className="w-10 flex justify-center">
                  {getRankIcon(player.rank)}
                </div>
                <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center font-medium">
                  {player.name[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className={`font-medium text-lg ${player.rank === 1 ? 'text-[hsl(var(--answer-yellow))]' : 'text-foreground'}`}>
                    {player.name}
                  </p>
                  {player.rank === 1 && (
                    <p className="text-sm text-[hsl(var(--answer-yellow))]">Gagnant</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-medium">{player.score}</p>
                  <p className="text-sm text-muted-foreground">points</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <CustomButton
          variant="primary"
          onClick={onBack}
          className="w-full"
        >
          Nouvelle partie
        </CustomButton>
      </div>
    </div>
  )
}
