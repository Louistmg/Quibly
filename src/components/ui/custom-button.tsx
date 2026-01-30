import { Button as ShadcnButton } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary'
  onClick?: () => void
  className?: string
  icon?: ReactNode
  disabled?: boolean
}

export function Button({
  children,
  variant = 'primary',
  onClick,
  className,
  icon,
  disabled
}: ButtonProps) {
  const baseStyles = "h-12 min-w-[200px] text-sm font-medium rounded-lg inline-flex items-center justify-center"

  const variants = {
    primary: "bg-foreground text-background hover:bg-foreground/90",
    secondary: "bg-transparent border border-foreground hover:bg-muted text-foreground"
  }

  return (
    <ShadcnButton
      onClick={onClick}
      disabled={disabled}
      className={cn(baseStyles, variants[variant], className)}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </ShadcnButton>
  )
}
