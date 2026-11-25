import type { ButtonHTMLAttributes, ReactNode } from 'react'
import arrowDown from '../assets/brand/arrow-down.svg'
import enterArrow from '../assets/brand/enter-arrow.svg'

type Icon = 'down' | 'up' | 'enter' | 'none'

interface FigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  /** Oscar's two button variants: arrows both sides (Default) or a trailing enter glyph (Variant2). */
  icon?: Icon
  variant?: 'primary' | 'quiet'
}

function Arrow({ direction }: { direction: 'down' | 'up' }) {
  return (
    <img
      src={arrowDown}
      alt=""
      aria-hidden
      className={`size-6 shrink-0 ${direction === 'up' ? 'rotate-180' : ''}`}
      width={24}
      height={24}
    />
  )
}

/** Oscar's button (116:2294): Figma-blue fill, deep-blue edge, mono caps label. */
export function FigButton({ children, icon = 'none', variant = 'primary', className = '', ...rest }: FigButtonProps) {
  // Name the button explicitly: some accessibility trees drop text that follows an aria-hidden
  // icon. The visible text and the accessible name stay identical (WCAG 2.5.3).
  const accessibleName = rest['aria-label'] ?? (typeof children === 'string' ? children : undefined)
  const look =
    variant === 'primary'
      ? 'bg-select border-select-deep text-select-ice hover:bg-[#0090ec] active:translate-y-px disabled:bg-[#7fcdff] disabled:border-[#7fb0cd]'
      : 'bg-paper border-line text-ink hover:border-select active:translate-y-px disabled:text-mute'
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-3 rounded-button border p-3 font-mono text-[20px] leading-none uppercase transition-[background-color,border-color,transform] duration-150 ${look} ${className}`}
      {...rest}
      aria-label={accessibleName}
    >
      {icon === 'down' || icon === 'up' ? <Arrow direction={icon} /> : null}
      <span className="whitespace-nowrap">{children}</span>
      {icon === 'down' || icon === 'up' ? <Arrow direction={icon} /> : null}
      {icon === 'enter' ? (
        <img src={enterArrow} alt="" aria-hidden className="h-4 w-3 shrink-0 -scale-x-100 rotate-90" />
      ) : null}
    </button>
  )
}
