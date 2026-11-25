import type { CSSProperties } from 'react'
import { FALL_CURVE } from '../features/dive/diveMotion'
import { formatDepth } from '../lib/tiers'

const STEP_PX = 22
const METRES_PER_STEP = 100
const STEPS = 50

interface DepthGaugeProps {
  depthM: number
  duration: number
}

/** A canvas ruler that scrolls past the fixed depth guide. */
export function DepthGauge({ depthM, duration }: DepthGaugeProps) {
  const stepsDown = Math.min(depthM / METRES_PER_STEP, STEPS)
  const style = {
    '--ruler-duration': duration + 'ms',
    '--fall-curve': FALL_CURVE,
    '--ruler-length': STEPS * STEP_PX + 'px',
    '--ruler-depth': stepsDown / STEPS,
    '--ruler-offset': -stepsDown * STEP_PX + 'px',
  } as CSSProperties

  return (
    <div className="dive-depth-gauge" role="img" aria-label={`Depth ${formatDepth(depthM)}`} style={style}>
      <div className="dive-depth-gauge__strip" aria-hidden="true">
        <div className="dive-depth-gauge__range" />
        <div className="dive-depth-ruler">
          {Array.from({ length: STEPS + 1 }, (_, i) => (
            <div className="dive-depth-gauge__mark" key={i} style={{ top: i * STEP_PX }}>
              <span className="dive-depth-gauge__tick" data-size={i % 10 === 0 ? 'major' : i % 5 === 0 ? 'medium' : 'minor'} />
              {i % 10 === 0 ? <span className="dive-depth-gauge__number">{formatDepth(i * METRES_PER_STEP)}</span> : null}
            </div>
          ))}
        </div>
      </div>
      <div className="dive-depth-gauge__guide" aria-hidden="true">
        <span className="dive-depth-gauge__readout">YOU <span>{formatDepth(depthM)}</span></span>
      </div>
    </div>
  )
}
