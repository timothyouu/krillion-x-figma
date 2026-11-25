import { useEffect, useRef, useState, type FormEvent } from 'react'
import { FigButton } from './FigButton'
import { SelectionFrame } from './SelectionFrame'
import { Timer } from './Timer'

interface AnswerInputProps {
  /** Changes per round and per rejected answer: clears the box and refocuses it. */
  resetKey: string
  disabled: boolean
  checking: boolean
  seconds: number
  pending: boolean
  /** 1 → 0 over the answering window. */
  fractionLeft: number
  onSubmit: (answer: string) => void
}

/** Oscar's bottom nav (108:12991): timer, answer box with selection handles, time bar, ENTER. */
export function AnswerInput({ resetKey, disabled, checking, seconds, pending, fractionLeft, onSubmit }: AnswerInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValue('')
  }, [resetKey])

  useEffect(() => {
    if (!disabled) inputRef.current?.focus()
  }, [disabled, resetKey])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (disabled || value.trim() === '') return
    onSubmit(value)
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full items-center gap-3 sm:gap-4" aria-busy={checking}>
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
            placeholder={pending ? 'HOLD YOUR BREATH' : 'YOUR ANSWER'}
            className="h-[51px] w-full bg-paper pl-5 pr-3 font-mono text-[20px] text-ink outline-none placeholder:text-ink-soft disabled:text-mute"
          />
        </SelectionFrame>
        <div className="h-[5px] w-full overflow-hidden rounded-[20px] bg-line" aria-hidden>
          <div
            className="h-full rounded-[20px] bg-mute transition-[width] duration-100 ease-linear"
            style={{ width: `${Math.max(0, Math.min(1, fractionLeft)) * 100}%` }}
          />
        </div>
      </div>
      <FigButton type="submit" icon="enter" disabled={disabled} className="shrink-0">
        {checking ? 'Wait' : 'Enter'}
      </FigButton>
    </form>
  )
}
