import type { ReactNode } from 'react'

interface NametagProps {
  children: ReactNode
  tone?: 'paper' | 'select'
  className?: string
}

/** Oscar's nametag (83:5286): the small label tab that sits on top of every card. */
export function Nametag({ children, tone = 'paper', className = '' }: NametagProps) {
  const toneClass =
    tone === 'select'
      ? 'bg-select text-white border-select rounded-[4px] px-2.5 py-px text-[14px] font-normal'
      : 'bg-paper text-ink border-line rounded-tag px-2.5 py-[5px] text-[15px] font-medium'
  return (
    <span className={`inline-flex w-fit items-center whitespace-nowrap border leading-none ${toneClass} ${className}`}>
      {children}
    </span>
  )
}
