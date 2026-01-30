import { Card, CardContent } from '@/components/ui/card'
import { Button as CustomButton } from '@/components/ui/custom-button'
import {
  GameController01Icon,
  UserGroupIcon,
  CrownIcon,
  ArrowRight01Icon,
  PlayIcon,
  ZapIcon,
  GithubIcon,
  GitPullRequestIcon,
  RocketIcon
} from 'hugeicons-react'

interface HomeProps {
  onCreate: () => void
  onJoin: () => void
}

export function Home({ onCreate, onJoin }: HomeProps) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-medium">Quibly</span>
          <CustomButton
            variant="secondary"
            icon={<GithubIcon className="w-4 h-4" />}
          >
            Star
          </CustomButton>
        </div>
      </nav>

      <section className="h-[calc(100dvh-4rem)] min-h-[500px] flex flex-col justify-center items-center px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight text-foreground mb-4 leading-tight">
            Créez des quiz captivants et jouez avec vos amis
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-snug mb-8">
            Quibly vous permet de créer facilement des quiz personnalisés et de défier vos amis, votre famille ou vos collègues en temps réel. Une expérience de jeu simple, rapide et divertissante.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <CustomButton
              variant="primary"
              onClick={onCreate}
              icon={<PlayIcon className="w-4 h-4" />}
            >
              Créer un quiz
            </CustomButton>
            <CustomButton
              variant="secondary"
              onClick={onJoin}
              icon={<UserGroupIcon className="w-4 h-4" />}
            >
              Rejoindre une partie
            </CustomButton>
          </div>
        </div>
      </section>

      <section id="stats" className="border-y border-border bg-secondary/30 mb-24">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl font-medium mb-1">10k+</p>
              <p className="text-sm text-muted-foreground">Quiz créés</p>
            </div>
            <div>
              <p className="text-3xl font-medium mb-1">50k+</p>
              <p className="text-sm text-muted-foreground">Parties jouées</p>
            </div>
            <div>
              <p className="text-3xl font-medium mb-1">100k+</p>
              <p className="text-sm text-muted-foreground">Joueurs actifs</p>
            </div>
            <div>
              <p className="text-3xl font-medium mb-1">4.8/5</p>
              <p className="text-sm text-muted-foreground">Note moyenne</p>
            </div>
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="container mx-auto px-6 py-36">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-medium mb-3">Fonctionnalités</h2>
          <p className="text-muted-foreground">
            Tout ce qu'il faut pour des quiz réussis
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center mb-3">
                <GameController01Icon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-medium mb-1">Création simple</h3>
              <p className="text-sm text-muted-foreground">Créez vos quiz en quelques minutes avec une interface intuitive</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center mb-3">
                <UserGroupIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-medium mb-1">Jusqu'à 100 joueurs</h3>
              <p className="text-sm text-muted-foreground">Invitez vos amis, collègues ou famille à jouer ensemble</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center mb-3">
                <ZapIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-medium mb-1">Temps réel</h3>
              <p className="text-sm text-muted-foreground">Réponses instantanées et compte à rebours pour plus de suspense</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center mb-3">
                <CrownIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-medium mb-1">Classement auto</h3>
              <p className="text-sm text-muted-foreground">Points calculés automatiquement selon la rapidité des réponses</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="opensource" className="container mx-auto px-6 py-32">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-medium mb-3">Open source</h2>
          <p className="text-muted-foreground">
            Quibly est développé par une communauté de passionnés. Le code source est public et chacun peut contribuer à son évolution.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center mb-3">
                <GithubIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-medium mb-1">Code source ouvert</h3>
              <p className="text-sm text-muted-foreground">Accédez au code complet sur GitHub et adaptez-le à vos besoins</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center mb-3">
                <GitPullRequestIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-medium mb-1">Contribuez</h3>
              <p className="text-sm text-muted-foreground">Ouvrez des issues et proposez vos idées d'amélioration</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center mb-3">
                <RocketIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-medium mb-1">Mises à jour</h3>
              <p className="text-sm text-muted-foreground">Suivez les nouvelles fonctionnalités et les corrections</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="comment-ca-marche" className="container mx-auto px-6 py-32">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-medium mb-3">Comment ça marche ?</h2>
          <p className="text-muted-foreground">
            Trois étapes simples
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium mb-3">
                1
              </div>
              <h3 className="text-base font-medium mb-1">Créez votre quiz</h3>
              <p className="text-sm text-muted-foreground">Choisissez un titre, ajoutez vos questions et définissez les bonnes réponses avec les points attribués</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium mb-3">
                2
              </div>
              <h3 className="text-base font-medium mb-1">Partagez le code</h3>
              <p className="text-sm text-muted-foreground">Un code unique de 6 caractères est généré. Partagez-le avec vos amis pour qu'ils rejoignent la partie</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium mb-3">
                3
              </div>
              <h3 className="text-base font-medium mb-1">Lancez la partie</h3>
              <p className="text-sm text-muted-foreground">Lancez la partie et jouez en temps réel avec un classement qui se met à jour instantanément</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container mx-auto px-6 pt-32 pb-56">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-medium mb-3">Prêt à jouer ?</h2>
          <p className="text-muted-foreground mb-6">
            Rejoignez des milliers d'utilisateurs qui animent leurs événements avec Quibly. Créez votre premier quiz gratuitement en quelques clics et défiez vos amis.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <CustomButton
              variant="primary"
              onClick={onCreate}
              icon={<PlayIcon className="w-4 h-4" />}
            >
              Créer un quiz
            </CustomButton>
            <CustomButton
              variant="secondary"
              onClick={onJoin}
              icon={<ArrowRight01Icon className="w-4 h-4" />}
            >
              Rejoindre une partie
            </CustomButton>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-lg font-medium">Quibly</span>
            <p className="text-sm text-muted-foreground">
              Une alternative open source et gratuite à Kahoot
            </p>
            <div className="flex items-center gap-6">
              <a 
                href="https://github.com/quibly/quibly" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Conditions
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Confidentialité
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
