import markerSvg from '../assets/brand/marker.svg'
import { formatDepth } from '../lib/tiers'

// Oscar's milestones ruler (116:2482): a tick every 22 px, a medium tick every 5, a labelled
// tick every 10. Here one labelled step is 1,000 m, so the full 5,000 m trench is 50 steps.
const STEP_PX = 22
const METRES_PER_STEP = 100
const STEPS = 50
const MARKER_TOP = 'min(30dvh, 285px)'

interface DepthGaugeProps {
  depthM: number
}

function tickWidth(i: number): number {
  if (i % 10 === 0) return 13
  if (i % 5 === 0) return 10
  return 5
}

/** Right-edge depth ruler. The ruler scrolls up as you sink; the YOU marker stays put. */
export function DepthGauge({ depthM }: DepthGaugeProps) {
  const offsetPx = (Math.min(depthM, STEPS * METRES_PER_STEP) / METRES_PER_STEP) * STEP_PX
  return (
    <div
      className="pointer-events-none fixed inset-y-0 right-[max(43px,calc((100vw-1280px)/2+43px))] z-0 hidden w-[40px] xl:block"
      role="img"
      aria-label={`Depth ${formatDepth(depthM)}`}
    >
      <div
        className="absolute left-0 right-0 transition-transform duration-[920ms] ease-[var(--ease-sink)]"
        style={{ top: MARKER_TOP, transform: `translateY(${-offsetPx}px)` }}
      >
        {/* the rule line extends above the surface and below the trench floor */}
        <div className="absolute right-0 top-[-100vh] h-[calc(200vh+1100px)] w-[2px] bg-mute" />
        {Array.from({ length: STEPS + 1 }, (_, i) => (
          <div
            key={i}
            className="absolute right-[2px] h-[2px] bg-mute"
            style={{ top: i * STEP_PX - 1, width: tickWidth(i) }}
          >
            {i % 10 === 0 ? (
              <span className="absolute left-[-10.5px] top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap font-mono text-[10px] text-mute">
                {formatDepth(i * METRES_PER_STEP)}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <div className="absolute right-[-16px] flex items-center gap-[5px]" style={{ top: `calc(${MARKER_TOP} - 9px)` }}>
        <span className="font-mono text-[10px] text-select">YOU</span>
        <img src={markerSvg} alt="" aria-hidden width={31} height={18} />
      </div>
    </div>
  )
}
