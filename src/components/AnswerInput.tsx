import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { clearLift, rememberLift } from '../features/dive/diveMotion'
import { FigButton } from './FigButton'
import { SelectionFrame } from './SelectionFrame'
import { Timer } from './Timer'

const SNAP_BACK_MS = 260
/** Resting offset of the picked-up answer (matches the end of the answer-pickup keyframes). */
const LIFT_OFFSET = { x: 4, y: -14 }

interface AnswerInputProps {
  /** Changes per round and per rejected answer: clears the box and refocuses it. */
  resetKey: string
  disabled: boolean
  checking: boolean
  seconds: number
  pending: boolean
  /** The clock ran out: the box deselects while the round finishes. */
  expired?: boolean
  /** 1 → 0 over the answering window. */
  fractionLeft: number
  onSubmit: (answer: string) => void
}

type Lift = { text: string; returning: boolean }

/** Oscar's bottom nav (108:12991): timer, answer box with selection handles, time bar, ENTER. */
export function AnswerInput({ resetKey, disabled, checking, seconds, pending, expired = false, fractionLeft, onSubmit }: AnswerInputProps) {
  const [value, setValue] = useState('')
  const [lift, setLift] = useState<Lift | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const liftRef = useRef<HTMLSpanElement>(null)
  const urgent = !pending && !expired && seconds <= 5 && seconds > 0

  useEffect(() => {
    setValue('')
  }, [resetKey])

  useEffect(() => {
    if (!disabled) inputRef.current?.focus()
  }, [disabled, resetKey])

  // Record where the lifted answer hovers so the reveal can carry it to the tier ladder.
  useLayoutEffect(() => {
    const element = liftRef.current
    if (!lift || lift.returning || !element) return
    const rect = element.getBoundingClientRect()
    rememberLift(new DOMRect(rect.left + LIFT_OFFSET.x, rect.top + LIFT_OFFSET.y, rect.width, rect.height))
  }, [lift])

  // Checking ended without a reveal (no echo or time up): drop the answer back into the box.
  useEffect(() => {
    if (checking || !lift || lift.returning) return
    clearLift()
    setLift({ ...lift, returning: true })
  }, [checking, lift])

  useEffect(() => {
    if (!lift?.returning) return
    const timer = window.setTimeout(() => setLift(null), SNAP_BACK_MS)
    return () => window.clearTimeout(timer)
  }, [lift])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (disabled || value.trim() === '') return
    setLift({ text: value.trim(), returning: false })
    onSubmit(value)
  }

  const lifted = lift !== null && !lift.returning

  return (
    <form
      onSubmit={handleSubmit}
      className={'answer-box flex w-full items-center gap-3 sm:gap-4 max-[359px]:grid max-[359px]:grid-cols-[auto_minmax(0,1fr)]' + (urgent ? ' answer-box--urgent' : '') + (expired ? ' answer-box--expired' : '')}
      aria-busy={checking}
    >
      <Timer seconds={seconds} pending={pending} />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <SelectionFrame className="w-full">
          <label className="sr-only" htmlFor="answer">
            Your answer
          </label>
          <input
            ref={inputRef}
            id="answer"
            name="answer"
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            maxLength={100}
            value={value}
            disabled={disabled}
            onChange={(e) => setValue(e.target.value)}
            placeholder={pending ? 'GET READY' : 'YOUR ANSWER'}
            className={'h-[51px] w-full bg-paper pl-5 pr-3 font-mono text-[20px] text-ink outline-none placeholder:text-ink-soft disabled:text-mute' + (lifted ? ' text-transparent!' : '') + (lift ? ' placeholder:text-transparent' : '')}
          />
          {lift ? (
            <span
              key={lift.returning ? 'return' : 'lift'}
              ref={liftRef}
              className={'answer-lift' + (lift.returning ? ' answer-lift--return' : '')}
              aria-hidden="true"
            >
              <SelectionFrame className="max-w-full">
                <span className="block truncate bg-paper px-1.5 py-0.5 font-mono text-[20px] leading-[26px] text-ink">{lift.text}</span>
              </SelectionFrame>
            </span>
          ) : null}
        </SelectionFrame>
        <div className="h-[5px] w-full overflow-hidden rounded-[20px] bg-line" aria-hidden>
          <div
            className={'answer-box__time h-full w-full origin-left rounded-[20px] transition-[transform,background-color] duration-100 ease-linear ' + (urgent ? 'bg-[#f24e1e]' : 'bg-mute')}
            style={{ transform: 'scaleX(' + Math.max(0, Math.min(1, fractionLeft)) + ')' }}
          />
        </div>
      </div>
      <FigButton type="submit" icon="enter" disabled={disabled} className="shrink-0 max-[359px]:col-start-2 max-[359px]:justify-self-end">
        {checking ? 'Wait' : 'Enter'}
      </FigButton>
    </form>
  )
}
