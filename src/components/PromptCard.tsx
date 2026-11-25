import type { ReactNode } from 'react'
import { Nametag } from './Nametag'
import { SelectionFrame } from './SelectionFrame'
import { Stamp } from './Stamp'

interface PromptCardProps {
  round: number
  roundCount: number
  theme: string
  descending: boolean
  /** Prompt text, straight from start_prompt. */
  text: string
  subline: ReactNode
}

/** Oscar's question component (108:11014): nametag tab, white card, mono prompt, stamps. */
export function PromptCard({ round, roundCount, theme, descending, text, subline }: PromptCardProps) {
  return (
    <section
      className="prompt-frame relative flex w-full flex-col gap-[5px]"
      data-descending={descending}
      aria-labelledby="prompt-text"
    >
      <Nametag>
        Prompt {round} of {roundCount}
        {theme ? <span className="font-normal text-ink-soft">&nbsp;·&nbsp;{theme}</span> : null}
      </Nametag>
      <div className="relative w-full">
        <div className="relative w-full overflow-hidden border border-line bg-paper px-6 py-8 sm:p-12 lg:p-16 [@media(max-height:520px)]:px-6 [@media(max-height:520px)]:py-4">
          <div className="relative z-10 flex max-w-[640px] flex-col gap-5 [@media(max-height:520px)]:gap-2">
            {/* Keyed by text: the countdown line is wiped away top-down by the prompt in the same frame. */}
            <h1
              key={text}
              id="prompt-text"
              className="prompt-text font-mono text-[32px] leading-[1.15] font-medium text-balance sm:text-[40px] lg:text-[50px] [@media(max-height:520px)]:text-[30px]"
            >
              {text}
            </h1>
            <p className="text-[18px] text-ink-soft sm:text-[20px]" aria-live="polite">
              {subline}
            </p>
          </div>
          <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-[230px] md:block [@media(max-height:520px)]:hidden" aria-hidden>
            <Stamp hoverable kind="star" size={100} rotate={8} className="absolute right-[-17px] top-[14px]" />
            <Stamp hoverable kind="dot" size={149} className="absolute right-[14px] top-[113px]" />
            <Stamp hoverable kind="heart" size={128} rotate={-12} className="absolute right-[75px] top-[109px]" />
          </div>
        </div>
        {descending ? (
          <div className="prompt-frame__snap" aria-hidden="true">
            <SelectionFrame className="h-full">{null}</SelectionFrame>
          </div>
        ) : null}
      </div>
    </section>
  )
}
