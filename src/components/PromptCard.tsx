import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
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
  const frameRef = useRef<HTMLDivElement>(null)
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
        <div ref={frameRef} className="relative w-full overflow-hidden border border-line bg-paper px-6 py-8 sm:p-12 lg:p-16 [@media(max-height:520px)]:px-6 [@media(max-height:520px)]:py-4">
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
        {descending ? <FrameSnap frame={frameRef} /> : null}
      </div>
    </section>
  )
}

/**
 * The countdown card snaps into place like a frame dropped onto the canvas: pink alignment
 * guides flash, the blue selection and its handles pop on, and a size badge reads out the frame.
 * The selection holds until the prompt arrives.
 */
function FrameSnap({ frame }: { frame: RefObject<HTMLDivElement | null> }) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  // offsetWidth/Height ignore the arrival transform, so the badge shows the settled size.
  useLayoutEffect(() => {
    const element = frame.current
    if (element) setSize({ width: element.offsetWidth, height: element.offsetHeight })
  }, [frame])

  return (
    <div className="prompt-frame__snap" aria-hidden="true">
      <span className="prompt-frame__guide prompt-frame__guide--rows" />
      <span className="prompt-frame__guide prompt-frame__guide--columns" />
      <SelectionFrame className="prompt-frame__selection h-full">{null}</SelectionFrame>
      {size ? <span className="prompt-frame__size">{size.width} × {size.height}</span> : null}
    </div>
  )
}
