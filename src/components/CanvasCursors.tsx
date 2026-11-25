import { useEffect, useState, type CSSProperties } from 'react'
import type { TierKey } from '../lib/types'
import { HighFiveHand } from './HighFiveHand'
import { Stamp } from './Stamp'

const crew = [
  { name: 'TK', color: '#2454c5' },
  { name: 'Joanna', color: '#a23577' },
  { name: 'Miggi', color: '#006e62' },
  { name: 'Alex', color: '#aa4728' },
  { name: 'Michael', color: '#6242a3' },
  { name: 'Ankita', color: '#9b365c' },
  { name: 'Christian', color: '#26627b' },
  { name: 'Srishti', color: '#5a631d' },
  { name: 'Timmy', color: '#2250b8' },
  { name: 'Oscar', color: '#a0441d' },
  { name: 'Nathan', color: '#594694' },
]

const lanes = [
  { side: 'left', people: crew.filter((_, index) => index % 2 === 0) },
  { side: 'right', people: crew.filter((_, index) => index % 2 === 1) },
] as const

export interface CursorReaction {
  id: string
  kind: 'landed' | 'rare' | 'no-echo' | 'timeout'
  tier: TierKey | 'no_echo'
}

interface CanvasCursorsProps {
  scene: 'home' | 'dive'
  layout: 'margins' | 'compact'
  reaction?: CursorReaction
}

export function CanvasCursors({ scene, layout, reaction }: CanvasCursorsProps) {
  const [expiredReaction, setExpiredReaction] = useState('')
  const reactionId = reaction?.id
  const [hidden, setHidden] = useState(() => document.hidden)

  useEffect(() => {
    const syncVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', syncVisibility)
    return () => document.removeEventListener('visibilitychange', syncVisibility)
  }, [])

  useEffect(() => {
    if (!reactionId) return
    const timer = window.setTimeout(() => setExpiredReaction(reactionId), 860)
    return () => window.clearTimeout(timer)
  }, [reactionId])

  return (
    <div
      aria-hidden="true"
      className={'canvas-cursors canvas-cursors--' + layout + ' canvas-cursors--' + scene}
      data-paused={hidden}
    >
      {lanes.map(({ side, people }, index) => (
        <div key={side} className={'canvas-cursors__lane canvas-cursors__lane--' + side}>
          <RoamingCursor people={people} reaction={index === 0 && reactionId !== expiredReaction ? reaction : undefined} />
        </div>
      ))}
    </div>
  )
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function flightStyle(): CSSProperties {
  const direction = Math.random() < 0.5 ? 1 : -1
  const x = (position: number) => direction === 1 ? position : 1 - position
  return {
    '--cursor-start-x': x(randomBetween(0, 0.25)),
    '--cursor-start-y': randomBetween(0.1, 0.88),
    '--cursor-turn-x': x(randomBetween(0.3, 0.72)),
    '--cursor-turn-y': randomBetween(0, 1),
    '--cursor-pause-x': x(randomBetween(0.56, 1)),
    '--cursor-pause-y': randomBetween(0.12, 0.95),
    '--cursor-exit-x': x(randomBetween(0.12, 0.9)),
    '--cursor-exit-y': randomBetween(0, 1),
    '--cursor-duration': randomBetween(3700, 6600) + 'ms',
    '--cursor-delay': randomBetween(70, 840) + 'ms',
  } as CSSProperties
}

function RoamingCursor({ people, reaction }: { people: (typeof crew)[number][]; reaction?: CursorReaction }) {
  const [flight, setFlight] = useState(() => ({
    step: Math.floor(Math.random() * people.length),
    style: flightStyle(),
  }))
  const person = people[flight.step % people.length]
  if (!person) return null

  function takeAnotherRoute() {
    const style = flightStyle()
    setFlight(({ step }) => ({ step: step + 1, style }))
  }

  return (
    <div
      key={flight.step}
      className="canvas-cursors__cursor"
      style={{ ...flight.style, color: person.color, '--cursor-color': person.color } as CSSProperties}
      data-reacting={reaction?.kind}
      onAnimationEnd={(event) => { if (event.target === event.currentTarget) takeAnotherRoute() }}
    >
      <div className="canvas-cursors__pose" key={reaction ? 'pose-' + reaction.id : undefined}>
        <svg className="canvas-cursors__arrow" width="20" height="22" viewBox="0 0 20 22" fill="none">
          <path d="M2 1.5 18 13l-7.6.5L7 20 2 1.5Z" fill="currentColor" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        <span className="canvas-cursors__name">{person.name}</span>
      </div>
      <span className="canvas-cursors__hand"><HighFiveHand /></span>
      {reaction ? (
        <span key={reaction.id} className="canvas-cursors__reaction">
          <Stamp tier={reaction.tier} size={28} />
        </span>
      ) : null}
    </div>
  )
}
