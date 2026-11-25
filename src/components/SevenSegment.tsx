// Seven-segment digits, standing in for the "Digital Numbers" face in Oscar's timer (108:12959),
// which is not available as a web font. Unlit segments ghost in the line gray like his "00".

type Segment = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g'

const DIGIT_SEGMENTS: Record<string, readonly Segment[]> = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'],
  '1': ['b', 'c'],
  '2': ['a', 'b', 'g', 'e', 'd'],
  '3': ['a', 'b', 'g', 'c', 'd'],
  '4': ['f', 'g', 'b', 'c'],
  '5': ['a', 'f', 'g', 'c', 'd'],
  '6': ['a', 'f', 'g', 'e', 'd', 'c'],
  '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  '9': ['a', 'b', 'c', 'd', 'f', 'g'],
}

const T = 2.2 // segment thickness in a 12 x 22 digit cell

function horizontal(x1: number, x2: number, y: number): string {
  const h = T / 2
  return `${x1},${y} ${x1 + h},${y - h} ${x2 - h},${y - h} ${x2},${y} ${x2 - h},${y + h} ${x1 + h},${y + h}`
}

function vertical(x: number, y1: number, y2: number): string {
  const h = T / 2
  return `${x},${y1} ${x + h},${y1 + h} ${x + h},${y2 - h} ${x},${y2} ${x - h},${y2 - h} ${x - h},${y1 + h}`
}

const SEGMENT_POINTS: Record<Segment, string> = {
  a: horizontal(1.6, 10.4, 1.2),
  b: vertical(10.8, 1.6, 10.6),
  c: vertical(10.8, 11.4, 20.4),
  d: horizontal(1.6, 10.4, 20.8),
  e: vertical(1.2, 11.4, 20.4),
  f: vertical(1.2, 1.6, 10.6),
  g: horizontal(1.6, 10.4, 11),
}

const ALL: readonly Segment[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
const GHOST = new Set<Segment>(DIGIT_SEGMENTS['0'])

interface SevenSegmentProps {
  value: string
  /** Rendered digit height in px. */
  height: number
  litColor?: string
  ghostColor?: string
}

export function SevenSegment({ value, height, litColor = '#161616', ghostColor = '#e5e5e5' }: SevenSegmentProps) {
  const digits = value.split('')
  const cell = 12
  const gap = 2.4
  const width = digits.length * cell + (digits.length - 1) * gap
  return (
    <svg
      viewBox={`-0.2 -0.2 ${width + 0.4} 22.4`}
      height={height}
      width={(height * (width + 0.4)) / 22.4}
      aria-hidden
      className="block"
    >
      {digits.map((digit, i) => {
        const lit = new Set(DIGIT_SEGMENTS[digit] ?? [])
        return (
          <g key={i} transform={`translate(${i * (cell + gap)} 0)`}>
            {ALL.map((seg) => {
              const on = lit.has(seg)
              if (!on && !GHOST.has(seg)) return null
              return <polygon key={seg} points={SEGMENT_POINTS[seg]} fill={on ? litColor : ghostColor} />
            })}
          </g>
        )
      })}
    </svg>
  )
}
