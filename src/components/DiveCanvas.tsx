import type { CSSProperties } from 'react'
import { FALL_CURVE, SURFACE_MS } from '../features/dive/diveMotion'

interface DiveCanvasProps {
  depthM: number
  round: number
  duration: number
  cue?: string
  entering?: boolean
  surfacing?: boolean
}

export function DiveCanvas({ depthM, round, duration, cue, entering = false, surfacing = false }: DiveCanvasProps) {
  const offset = Math.min(5000, depthM) * 0.08 + Math.min(round, 5) * 62
  const style = {
    '--canvas-offset': -offset + 'px',
    '--canvas-tint': Math.min(0.37, depthM / 9600),
    '--canvas-duration': (surfacing ? SURFACE_MS : duration) + 'ms',
    '--fall-curve': FALL_CURVE,
  } as CSSProperties

  const modifier = surfacing ? ' dive-canvas--surface' : entering ? ' dive-canvas--enter' : ''

  return (
    <div className={'dive-canvas' + modifier} style={style} aria-hidden="true">
      <div className="dive-canvas__grid" />
      <div className="dive-canvas__tint" />
      {cue || surfacing ? (
        <div className="dive-canvas__guides" key={cue ?? 'surface'}>
          <span /><span /><span /><span />
        </div>
      ) : null}
    </div>
  )
}
