import { twoDigits } from '../lib/clock'
import { SevenSegment } from './SevenSegment'

interface TimerProps {
  seconds: number
  /** Countdown before the clock starts: digits turn Figma blue. */
  pending?: boolean
}

/** Oscar's timer (108:12992): white pill, seven-segment digits over a ghosted "00". */
export function Timer({ seconds, pending = false }: TimerProps) {
  const urgent = !pending && seconds <= 5 && seconds > 0
  const lit = pending ? '#009cff' : urgent ? '#f24e1e' : '#161616'
  return (
    <div
      role="timer"
      aria-label={pending ? `Clock starts in ${seconds} seconds` : `${seconds} seconds left`}
      className="flex h-[70px] min-w-[70px] shrink-0 items-center justify-center rounded-full bg-paper px-[15px]"
    >
      <div key={pending ? seconds : 'clock'} className={pending ? 'countdown-step' : undefined}>
        <SevenSegment value={twoDigits(seconds)} height={30} litColor={lit} />
      </div>
    </div>
  )
}
