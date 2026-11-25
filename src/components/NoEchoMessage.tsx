import { Stamp } from './Stamp'

interface NoEchoMessageProps {
  input: string | null
  /** Changes on each rejection so the stamp presses again. */
  attempt: number
}

/** Krillion's rejected-answer line, with Oscar's "no echo" stamp (thumbs down). */
export function NoEchoMessage({ input, attempt }: NoEchoMessageProps) {
  return (
    <div className="flex min-h-9 items-center gap-2" role="status" aria-live="assertive">
      {input ? (
        <div key={attempt} className="no-echo-shake flex items-center gap-2">
          <Stamp tier="no_echo" size={32} rotate={-8} press />
          <p className="font-mono text-[16px] text-ink">
            <span className="break-all">“{input}”</span>: not on the board. <span className="text-ink-soft">try again</span>
          </p>
        </div>
      ) : null}
    </div>
  )
}
