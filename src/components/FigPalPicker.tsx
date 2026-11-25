import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { FIGPALS } from '../lib/figpals'
import { FigPalAvatar } from './FigPalAvatar'
import { Nametag } from './Nametag'
import { SelectionFrame } from './SelectionFrame'

interface FigPalPickerProps {
  selected: string
  onSelect: (slug: string) => void
  onClose: () => void
}

/** Oscar's charaSelect (83:12724): nametag, white panel, close glyph, 5-up scrolling grid. */
export function FigPalPicker({ selected, onSelect, onClose }: FigPalPickerProps) {
  const selectedRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    selectedRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function moveSelection(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1
      : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : 0
    if (!direction) return

    event.preventDefault()
    const nextIndex = (index + direction + FIGPALS.length) % FIGPALS.length
    const next = FIGPALS[nextIndex]
    if (!next) return
    event.currentTarget.parentElement?.querySelectorAll('button')[nextIndex]?.focus()
    onSelect(next.slug)
  }

  return (
    <section className="flex w-full flex-col gap-[5px]" aria-labelledby="picker-title">
      <Nametag>
        <span id="picker-title">Pick Your Figpal</span>
      </Nametag>
      <div className="relative border border-line bg-paper">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close FigPal picker"
          className="absolute left-3 top-2 z-10 flex size-11 items-center justify-center rounded-[6px] text-ink-soft hover:bg-canvas hover:text-ink sm:left-[12px] sm:top-[30px]"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <div className="max-h-[min(441px,calc(var(--app-safe-height)-7rem))] overflow-y-auto px-4 pb-6 pt-14 sm:pl-[65px] sm:pr-[40px] sm:pt-[42px]">
          <div role="radiogroup" aria-labelledby="picker-title" className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-1 sm:grid-cols-[repeat(5,87.4px)]">
            {FIGPALS.map((figpal, index) => {
              const isSelected = figpal.slug === selected
              return (
                <button
                  key={figpal.slug}
                  ref={isSelected ? selectedRef : undefined}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onKeyDown={(event) => moveSelection(event, index)}
                  aria-label={figpal.name}
                  onClick={() => onSelect(figpal.slug)}
                  className="group relative flex h-[103.68px] flex-col items-center p-[5px] outline-none focus-visible:outline-2 focus-visible:outline-select"
                >
                  <SelectionFrame visible={isSelected} handles={isSelected} className="group-hover:[&>div]:border-select">
                    <div className="flex h-[93.68px] w-[77.4px] items-center justify-center pb-[5px]">
                      <FigPalAvatar slug={figpal.slug} width={73} decorative />
                    </div>
                  </SelectionFrame>
                  {isSelected ? (
                    <Nametag tone="select" className="absolute bottom-[-4px] left-1/2 z-10 -translate-x-1/2 lowercase">
                      {figpal.name}
                    </Nametag>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
