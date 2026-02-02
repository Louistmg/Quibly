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
  type?: 'button' | 'submit' | 'reset'
}

export function Button({
  children,
  variant = 'primary',
  onClick,
  className,
  icon,
  disabled,
  type
}: ButtonProps) {
  const baseStyles = "h-12 px-8 text-sm font-medium rounded-lg inline-flex items-center justify-center"

  const variants = {
    primary: "bg-black text-white hover:bg-black/90",
    secondary:
      "bg-[hsl(var(--answer-blue))] text-white hover:bg-[hsl(var(--answer-blue))]/90 border-0"
  }

  return (
    <ShadcnButton
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={cn(baseStyles, variants[variant], className)}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </ShadcnButton>
  )
}
