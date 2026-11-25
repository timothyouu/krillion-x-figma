import type { CSSProperties } from 'react'
import type { PreviousRound } from '../features/dive/diveMachine'
import { FALL_CURVE, SURFACE_MS } from '../features/dive/diveMotion'
import { DescentBoard } from './DescentBoard'

interface DiveCanvasProps {
  depthM: number
  round: number
  duration: number
  cue?: string
  descending?: boolean
  /** Board content for the descent: who is diving, how far in, and what they last caught. */
  playerName?: string
  roundCount?: number
  previous?: PreviousRound | null
  surfacing?: boolean
}

export function DiveCanvas({
  depthM,
  round,
  duration,
  cue,
  descending = false,
  playerName = '',
  roundCount = 5,
  previous = null,
  surfacing = false,
}: DiveCanvasProps) {
  const offset = Math.min(5000, depthM) * 0.08 + Math.min(round, 5) * 62
  const style = {
    '--canvas-offset': -offset + 'px',
    '--canvas-tint': Math.min(0.37, depthM / 9600),
    '--canvas-duration': (surfacing ? SURFACE_MS : duration) + 'ms',
    '--fall-curve': FALL_CURVE,
  } as CSSProperties

  const modifier = surfacing ? ' dive-canvas--surface' : ''

  return (
    <div className={'dive-canvas' + modifier} style={style} aria-hidden="true">
      <div className="dive-canvas__viewport" data-descending={descending}>
        <div className="dive-canvas__grid" />
      </div>
      <div className="dive-canvas__tint" />
      {descending ? (
        <DescentBoard
          key={cue}
          round={round}
          roundCount={roundCount}
          playerName={playerName}
          previous={previous}
          depthM={depthM}
        />
      ) : null}
      {(cue && !descending) || surfacing ? (
        <div className="dive-canvas__guides" key={cue ?? 'surface'}>
          <span /><span /><span /><span />
        </div>
      ) : null}
    </div>
  )
}
