import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'
import cls from './button.module.css'

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost'
type Size = 'sm' | 'md'

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>) {
  const classes = [cls.base, cls[variant], cls[size], className].filter(Boolean).join(' ')
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}

