import { useEffect, useState, type CSSProperties } from 'react'
import { Stamp, type StampKind } from './Stamp'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

const CAMEO_MS = 4600
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

const scenes = {
  home: {
    messages: ['Hey, diver!', 'Figgy says hi', 'Nice sticker', 'See you below'],
    notes: [
      { text: 'Pick a FigPal', stamp: 'heart' },
      { text: 'Meet at the surface', stamp: 'plus-one' },
      { text: 'Five prompts ahead', stamp: 'star' },
    ],
  },
  dive: {
    messages: ['Down we go', 'Check the ruler', 'Another frame', 'See you deeper'],
    notes: [
      { text: 'Mark this depth', stamp: 'dot' },
      { text: 'One frame deeper', stamp: 'thumbs-up' },
      { text: 'Keep diving', stamp: 'star' },
    ],
  },
} satisfies Record<string, { messages: string[]; notes: { text: string; stamp: StampKind }[] }>

type Scene = keyof typeof scenes

interface CameoPlayback {
  step: number
  paused: boolean
}

export function useCanvasCameos(scene: Scene): CameoPlayback {
  const [step, setStep] = useState(() => scene === 'home' ? 0 : 1)
  const [hidden, setHidden] = useState(() => document.hidden)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const syncVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', syncVisibility)
    return () => document.removeEventListener('visibilitychange', syncVisibility)
  }, [])

  useEffect(() => {
    if (hidden || reducedMotion) return
    const timer = window.setInterval(() => setStep((value) => value + 1), CAMEO_MS)
    return () => window.clearInterval(timer)
  }, [hidden, reducedMotion])

  return { step, paused: hidden }
}

interface CanvasCameosProps extends CameoPlayback {
  scene: Scene
  layout: 'margins' | 'compact'
}

export function CanvasCameos({ scene, layout, step, paused }: CanvasCameosProps) {
  const { messages, notes } = scenes[scene]
  const index = step * 2
  const first = crew[index % crew.length]
  const second = crew[(index + 1) % crew.length]
  const note = notes[step % notes.length]
  if (!first || !second || !note) return null

  return (
    <div
      aria-hidden="true"
      className={'canvas-cameos canvas-cameos--' + layout + ' canvas-cameos--' + scene}
      data-paused={paused}
      style={{
        '--cameo-duration': CAMEO_MS + 'ms',
        '--cameo-roam': (step % 4 - 1) * 24 + 'px',
      } as CSSProperties}
    >
      <div className="canvas-cameos__lane canvas-cameos__lane--left">
        <span className="canvas-cameos__caption">Canvas cameos</span>
        <CanvasCursor key={first.name} person={first} message={messages[index % messages.length]} />
      </div>
      <div className="canvas-cameos__lane canvas-cameos__lane--right">
        <CanvasCursor key={second.name} person={second} message={messages[(index + 1) % messages.length]} />
        <div key={step} className="canvas-cameos__note">
          <span>{note.text}</span>
          <Stamp kind={note.stamp} size={27} rotate={10} className="canvas-cameos__sticker" />
        </div>
      </div>
    </div>
  )
}

function CanvasCursor({ person, message }: { person: (typeof crew)[number]; message?: string }) {
  return (
    <div className="canvas-cameos__cursor" style={{ '--cursor-color': person.color } as CSSProperties}>
      <svg width="20" height="22" viewBox="0 0 20 22" fill="none">
        <path d="M2 1.5 18 13l-7.6.5L7 20 2 1.5Z" fill="currentColor" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
      <span className="canvas-cameos__name">{person.name}</span>
      {message ? (
        <span className="canvas-cameos__chat">
          <span style={{ '--chat-steps': message.length } as CSSProperties}>{message}</span>
        </span>
      ) : null}
    </div>
  )
}
