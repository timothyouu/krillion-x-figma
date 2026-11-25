import type { CSSProperties } from 'react'
import { bucketIndexFor } from '../features/results/resultsFormat'
import type { HistogramBucket } from '../lib/types'

interface ScoreCurveProps {
  histogram: readonly HistogramBucket[]
  score: number
  maxScore: number
}

const HEIGHT = 168

/** Everyone's finished scores in 20 buckets, your bucket in Figma blue under a YOU cursor. */
export function ScoreCurve({ histogram, score, maxScore }: ScoreCurveProps) {
  const peak = Math.max(1, ...histogram.map((b) => b.count))
  const yours = bucketIndexFor(histogram, score)
  const youLeftPct = histogram.length > 0 ? ((yours + 0.5) / histogram.length) * 100 : 0
  const total = histogram.reduce((sum, b) => sum + b.count, 0)

  return (
    <figure className="flex flex-col gap-3">
      <div className="relative pt-9">
        <div
          className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${youLeftPct}%` }}
          aria-hidden
        >
          <span className="rounded-[4px] bg-select px-1.5 py-px font-mono text-[11px] leading-[16px] text-white">YOU</span>
          <span className="h-[14px] w-[2px] bg-select" />
        </div>
        <div className="flex items-end gap-[3px] border-b-2 border-mute" style={{ height: HEIGHT }} role="img"
          aria-label={`Score distribution of ${total} finished divers; you scored ${score} of ${maxScore}`}>
          {histogram.map((bucket, i) => {
            const h = bucket.count === 0 ? 2 : Math.max(6, (bucket.count / peak) * (HEIGHT - 8))
            return (
              <div
                key={bucket.from}
                title={`${bucket.from}–${bucket.to}: ${bucket.count}`}
                className={`histogram-bar flex-1 rounded-t-[3px] ${i === yours ? 'bg-select' : 'bg-line'}`}
                style={{ height: h, '--chart-delay': Math.min(i * 12, 160) + 'ms' } as CSSProperties}
              />
            )
          })}
        </div>
      </div>
      <figcaption className="flex justify-between font-mono text-[12px] text-mute tabular">
        <span>0</span>
        <span>{Math.round(maxScore / 2)}</span>
        <span>{maxScore}</span>
      </figcaption>
    </figure>
  )
}
