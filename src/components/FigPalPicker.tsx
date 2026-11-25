import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { FIGPALS } from '../lib/figpals'
import { FigButton } from './FigButton'
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
    selectedRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
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
      <div className="flex items-center justify-between">
        <Nametag>
          <span id="picker-title">Pick Your FigPal</span>
        </Nametag>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close FigPal picker"
          className="flex size-11 cursor-pointer items-center justify-center rounded-tag border border-line bg-paper text-ink-soft hover:border-select hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="border border-line bg-paper">
        <div className="max-h-[min(441px,calc(var(--app-safe-height)-12rem))] overflow-y-auto px-4 py-4 sm:px-8">
          <div role="radiogroup" aria-labelledby="picker-title" className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-1 sm:grid-cols-[repeat(5,87.4px)] sm:justify-center">
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
                  className="group relative flex h-[103.68px] scroll-my-3 cursor-pointer flex-col items-center p-[5px] outline-none focus-visible:outline-2 focus-visible:outline-select"
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
        <div className="flex justify-end border-t border-line px-4 py-2.5 sm:px-8">
          <FigButton variant="quiet" className="min-h-11 px-5! text-[15px]!" onClick={onClose}>
            Done
          </FigButton>
        </div>
      </div>
    </section>
  )
}
