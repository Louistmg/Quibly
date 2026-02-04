import { cn } from '@/lib/utils'

type SiteFooterProps = {
  onOpenTerms: () => void
  onOpenPrivacy: () => void
  active?: 'terms' | 'privacy' | null
}

export function SiteFooter({ onOpenTerms, onOpenPrivacy, active = null }: SiteFooterProps) {
  const linkClassName = (isActive: boolean) => cn(
    'text-sm transition-colors',
    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
  )

  const isTermsActive = active === 'terms'
  const isPrivacyActive = active === 'privacy'

  return (
    <footer className="border-t border-border py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <img
            src="/logo.png"
            alt="Logo Quibly"
            className="h-16 w-56 object-contain translate-y-1"
          />
          <p className="text-sm text-muted-foreground">
            Une alternative open source et gratuite à Kahoot
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/Louistmg/Quibly"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href="#conditions"
              onClick={onOpenTerms}
              className={linkClassName(isTermsActive)}
              aria-current={isTermsActive ? 'page' : undefined}
            >
              Conditions
            </a>
            <a
              href="#confidentialite"
              onClick={onOpenPrivacy}
              className={linkClassName(isPrivacyActive)}
              aria-current={isPrivacyActive ? 'page' : undefined}
            >
              Confidentialité
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
