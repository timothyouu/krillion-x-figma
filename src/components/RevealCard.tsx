import type { CSSProperties } from 'react'
import type { RevealData } from '../features/dive/diveMachine'
import { formatDepth, getTier } from '../lib/tiers'
import { Nametag } from './Nametag'
import { Stamp } from './Stamp'
import { TierLadder, sinkDurationMs } from './TierLadder'

interface RevealCardProps {
  reveal: RevealData
  roundCount: number
  promptText: string | null
}

function normalize(text: string | null): string {
  return (text ?? '').trim().toLowerCase()
}

/** Per-answer reveal: the sinking ladder on the left, the verdict on the right. */
export function RevealCard({ reveal, roundCount, promptText }: RevealCardProps) {
  const landed = reveal.accepted && reveal.tier !== null
  const tier = landed && reveal.tier ? getTier(reveal.tier) : null
  const stampMotion = { '--stamp-delay': sinkDurationMs(reveal.tier) + 'ms' } as CSSProperties
  const typedDifferently = landed && reveal.yourInput && normalize(reveal.yourInput) !== normalize(reveal.answer)

  return (
    <section className="flex w-full flex-col gap-[5px]" aria-labelledby="reveal-title">
      <Nametag>
        Prompt {reveal.round} of {roundCount}
        <span className="font-normal text-ink-soft">&nbsp;·&nbsp;{landed ? 'landed' : 'surfaced empty'}</span>
      </Nametag>
      <div className="grid w-full gap-8 border border-line bg-paper px-6 py-7 sm:px-10 sm:py-9 md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] md:gap-8 lg:px-14">
        <div className="flex min-w-0 flex-col gap-4">
          {promptText ? <p className="font-mono text-[16px] text-ink-soft sm:text-[18px]">{promptText}</p> : null}
          <TierLadder tier={landed ? reveal.tier : null} chipText={landed ? (reveal.answer ?? '') : 'nothing landed'} />
        </div>

        <div className="flex min-w-0 flex-col justify-center gap-4" aria-live="polite">
          <div className="flex items-center gap-4">
            <Stamp
              tier={tier ? tier.key : 'no_echo'}
              size={80}
              rotate={tier ? -8 : 10}
              press
              style={stampMotion}
              label={tier ? tier.label : 'Nothing landed'}
              className="shrink-0"
            />
            <h2 id="reveal-title" className="text-[34px] leading-[1.05] sm:text-[40px]">
              {tier ? tier.word : 'nothing landed'}
            </h2>
          </div>
          {tier && reveal.answer ? (
            <p className="font-mono text-[20px] leading-snug break-words sm:text-[22px]">
              {reveal.answer}
            </p>
          ) : null}
          <p className="font-mono text-[18px] uppercase sm:text-[20px]">
            +{reveal.points} pts
            <span className="text-ink-soft"> · {tier ? `sink ${formatDepth(reveal.depthM).replace('-', '')}` : 'the clock beat you to it.'}</span>
          </p>
          {tier ? (
            <p className="text-[18px] text-ink-soft sm:text-[20px]">
              {reveal.tierDescription ?? tier.description}
            </p>
          ) : null}
          {typedDifferently ? (
            <p className="text-[15px] text-ink-soft">
              You typed <span className="font-mono text-ink">“{reveal.yourInput}”</span>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
