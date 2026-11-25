import { useState } from 'react'
import { getTier, isTierKey } from '../lib/tiers'
import type { CatchRound, ResultsRound } from '../lib/types'
import { Nametag } from './Nametag'
import { SelectionFrame } from './SelectionFrame'
import { Stamp } from './Stamp'

interface CatchListProps {
  rounds: readonly CatchRound[]
  results: readonly ResultsRound[]
}

/** The Catch: one row per prompt; expanding lists every accepted answer, figlion first. */
export function CatchList({ rounds, results }: CatchListProps) {
  const [open, setOpen] = useState<number | null>(rounds[0]?.round ?? null)
  return (
    <ul className="flex flex-col">
      {rounds.map((round) => {
        const mine = results.find((r) => r.round === round.round)
        const isOpen = open === round.round
        const panelId = `catch-${round.round}`
        return (
          <li key={round.round} className="border-b border-line last:border-b-0">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(isOpen ? null : round.round)}
              aria-label={`Prompt ${round.round}: ${round.prompt}. You: ${
                mine?.accepted ? (mine.answer ?? '') : 'nothing landed'
              }, ${mine?.points ?? 0} points`}
              className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4 text-left hover:bg-canvas/60 sm:px-2"
            >
              <span className="font-mono text-[12px] text-mute">P{round.round}</span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[17px] sm:text-[19px]">{round.prompt}</span>
                <span className="truncate font-mono text-[13px] text-ink-soft">
                  {mine?.accepted ? `you: ${mine.answer ?? ''}` : 'you: nothing landed'}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-mono text-[16px] tabular">+{mine?.points ?? 0}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </button>
            {isOpen ? (
              <ol id={panelId} className="catch-expand flex flex-col gap-1 pb-5 sm:pl-10">
                {(round.answers ?? []).map((a, i) => {
                  const tier = isTierKey(a.tier) ? getTier(a.tier) : null
                  const row = (
                    <div className="flex items-start gap-3 bg-paper px-3 py-2">
                      {tier ? <Stamp tier={tier.key} size={28} className="mt-0.5 shrink-0" /> : null}
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="font-mono text-[16px] sm:text-[17px]">{a.answer}</span>
                          <span className="text-[14px] text-ink-soft">{tier?.word ?? a.tier_label}</span>
                        </div>
                        {a.fun_fact ?<p className="text-[15px] text-ink-soft">{a.fun_fact}</p> : null}
                      </div>
                      <span className="shrink-0 font-mono text-[15px] tabular">{a.points}</span>
                    </div>
                  )
                  return (
                    <li key={`${a.answer}-${i}`} className="relative">
                      {a.yours ? (
                        <SelectionFrame>
                          {row}
                          <Nametag tone="select" className="absolute -top-3 right-3">
                            you
                          </Nametag>
                        </SelectionFrame>
                      ) : (
                        <div className="border-2 border-transparent">{row}</div>
                      )}
                    </li>
                  )
                })}
              </ol>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
