import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button as CustomButton } from '@/components/ui/custom-button'
import type { GameSession, Player as UiPlayer, Quiz } from '@/types'
import type { Player as DbPlayer } from '@/lib/supabase'
import { useSupabase } from '@/hooks/useSupabase'
import { ArrowLeft01Icon, UserGroupIcon, PlayIcon, Copy01Icon, Tick02Icon } from 'hugeicons-react'
import { toDataURL } from 'qrcode'

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
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const copyTimeoutRef = useRef<number | null>(null)
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

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    const isIos = /iP(hone|od|ad)/.test(window.navigator.userAgent)
      || (window.navigator.userAgent.includes('Mac') && 'ontouchend' in document)
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
    scrollToTop()
    const frame = window.requestAnimationFrame(scrollToTop)
    const timeout = window.setTimeout(scrollToTop, 120)
    const longerTimeout = window.setTimeout(scrollToTop, 800)
    const viewport = window.visualViewport
    let guardTimeout: number | null = null
    const handleViewportChange = () => scrollToTop()
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
  }, [session?.id])

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
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current)
      }
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000)
    }
  }

  const gameCode = session?.code ?? ''

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let isActive = true

    const generateQrCode = async () => {
      if (!gameCode || typeof window === 'undefined') {
        if (isActive) setQrCodeUrl(null)
        return
      }

      try {
        const baseUrl = `${window.location.origin}${window.location.pathname}`
        const joinUrl = new URL(baseUrl)
        joinUrl.searchParams.set('code', gameCode)

        const dataUrl = await toDataURL(joinUrl.toString(), {
          width: 220,
          margin: 1,
          errorCorrectionLevel: 'M',
        })

        if (isActive) setQrCodeUrl(dataUrl)
      } catch (err) {
        console.error('Erreur lors de la génération du QR code :', err)
        if (isActive) setQrCodeUrl(null)
      }
    }

    void generateQrCode()
    return () => {
      isActive = false
    }
  }, [gameCode])

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

        <div className={isHost ? "grid md:grid-cols-2 gap-6" : "grid gap-6"}>
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
              {!isHost && (
                <div className="mt-5 text-center p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="font-medium text-foreground">En attente du lancement...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    L'hôte démarrera la partie bientôt
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {isHost && (
            <Card className="border border-border shadow-sm">
              <CardHeader className="text-center pb-3">
                <CardTitle className="text-lg font-medium">Code de la partie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="text-4xl font-medium tracking-wider text-[hsl(var(--answer-blue))]">
                    {gameCode || '—'}
                  </div>
                  {qrCodeUrl && (
                    <div className="rounded-xl border border-border bg-background p-3 shadow-xs">
                      <img
                        src={qrCodeUrl}
                        alt="QR code pour rejoindre la partie"
                        className="h-36 w-36"
                      />
                    </div>
                  )}
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

                <CustomButton
                  variant="primary"
                  onClick={onStart}
                  className="w-full"
                  icon={<PlayIcon className="w-5 h-5" />}
                >
                  Lancer la partie
                </CustomButton>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
