import { useEffect, useState, type CSSProperties } from 'react'
import { VERDICT_LEAD_MS, VERDICT_STAGGER_MS, sinkDurationMs } from '../features/dive/diveMotion'
import type { RevealData } from '../features/dive/diveMachine'
import { formatDepth, getTier } from '../lib/tiers'
import { Nametag } from './Nametag'
import { Stamp } from './Stamp'
import { TierLadder } from './TierLadder'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

interface RevealCardProps {
  reveal: RevealData
  roundCount: number
  promptText: string | null
  figpalSlug?: string
}

function normalize(text: string | null): string {
  return (text ?? '').trim().toLowerCase()
}

/** Each verdict line rises in turn after the stamp presses. */
function lineDelay(index: number): CSSProperties {
  return { '--verdict-index': index } as CSSProperties
}

/** Per-answer reveal: the sinking ladder on the left, the verdict on the right. */
export function RevealCard({ reveal, roundCount, promptText, figpalSlug = 'figgy' }: RevealCardProps) {
  const reducedMotion = usePrefersReducedMotion()
  const landed = reveal.accepted && reveal.tier !== null
  const tier = landed && reveal.tier ? getTier(reveal.tier) : null
  // The verdict waits for the chip to land so the fall carries the suspense.
  const landMs = tier && !reducedMotion ? sinkDurationMs(reveal.tier) : 0
  const typedDifferently = landed && reveal.yourInput && normalize(reveal.yourInput) !== normalize(reveal.answer)
  const heavy = tier !== null && tier.points >= 85
  const announcement = tier ? `Landed ${tier.word}. ${reveal.points} points, sink ${formatDepth(reveal.depthM).replace('-', '')}.` : 'Nothing landed. The clock beat you to it.'
  const announced = useLandingAnnouncement(announcement, landMs)

  const verdictMotion = {
    '--land-at': landMs + 'ms',
    '--verdict-lead': VERDICT_LEAD_MS + 'ms',
    '--verdict-stagger': VERDICT_STAGGER_MS + 'ms',
    '--ink-color': tier?.color ?? 'transparent',
  } as CSSProperties

  return (
    <section className="dive-reveal flex w-full flex-col gap-[5px]" aria-labelledby="reveal-title">
      <Nametag>
        Prompt {reveal.round} of {roundCount}
        <span className="font-normal text-ink-soft">&nbsp;·&nbsp;{landed ? 'landed' : 'surfaced empty'}</span>
      </Nametag>
      <div
        className={'grid w-full gap-5 border border-line bg-paper px-4 py-5 sm:px-10 sm:py-9 md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] md:gap-8 lg:px-14 ' + (heavy ? 'reveal-thud' : '')}
        style={verdictMotion}
      >
        <div className="flex min-w-0 flex-col gap-4">
          {promptText ? <p className="font-mono text-[16px] text-ink-soft sm:text-[18px]">{promptText}</p> : null}
          <TierLadder figpalSlug={figpalSlug} tier={landed ? reveal.tier : null} chipText={landed ? (reveal.answer ?? '') : 'nothing landed'} />
        </div>

        <div className="reveal-verdict relative flex min-w-0 flex-col justify-center gap-3 md:gap-4" data-holding={landMs > 0 || undefined}>
          {landMs > 0 ? (
            <div className="reveal-verdict__ghost" aria-hidden="true">
              <span>landing…</span>
            </div>
          ) : null}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative shrink-0">
              {tier ? <span className="stamp-ink" aria-hidden="true" /> : null}
              <Stamp
                tier={tier ? tier.key : 'no_echo'}
                size={80}
                rotate={tier ? -8 : 10}
                press
                hoverable
                style={{ '--stamp-delay': landMs + 'ms' } as CSSProperties}
                label={tier ? tier.label : 'Nothing landed'}
                className="size-14! sm:size-20!"
              />
            </div>
            <h2 id="reveal-title" className="reveal-line min-w-0 text-[clamp(1.75rem,8vw,2.125rem)] leading-[1.05] wrap-break-word sm:text-[40px]" style={lineDelay(0)}>
              {tier ? tier.word : 'nothing landed'}
            </h2>
          </div>
          {tier && reveal.answer ? (
            <p className="reveal-line font-mono text-[20px] leading-snug break-words sm:text-[22px]" style={lineDelay(1)}>
              {reveal.answer}
            </p>
          ) : null}
          <p className="reveal-line font-mono text-[18px] uppercase sm:text-[20px]" style={lineDelay(2)}>
            +{reveal.points} pts
            <span className="text-ink-soft"> · {tier ? `sink ${formatDepth(reveal.depthM).replace('-', '')}` : 'the clock beat you to it.'}</span>
          </p>
          {tier ? (
            <p className="reveal-line text-[18px] text-ink-soft sm:text-[20px]" style={lineDelay(2)}>
              {reveal.tierDescription ?? tier.description}
            </p>
          ) : null}
          {typedDifferently ? (
            <p className="reveal-line text-[15px] text-ink-soft" style={lineDelay(3)}>
              You typed <span className="font-mono text-ink">“{reveal.yourInput}”</span>
            </p>
          ) : null}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{announced}</p>
    </section>
  )
}

/** Screen readers hear the verdict when the chip lands, not while it is still falling. */
function useLandingAnnouncement(text: string, delayMs: number): string {
  const [announced, setAnnounced] = useState(delayMs > 0 ? '' : text)
  useEffect(() => {
    if (delayMs <= 0) {
      setAnnounced(text)
      return
    }
    setAnnounced('')
    const timer = window.setTimeout(() => setAnnounced(text), delayMs)
    return () => window.clearTimeout(timer)
  }, [text, delayMs])
  return announced
}
