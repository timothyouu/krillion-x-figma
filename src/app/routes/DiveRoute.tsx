import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnswerInput } from '../../components/AnswerInput'
import { DepthGauge } from '../../components/DepthGauge'
import { DiveTotal } from '../../components/DiveTotal'
import { ErrorScreen } from '../../components/ErrorScreen'
import { FigButton } from '../../components/FigButton'
import { FigPalStage } from '../../components/FigPalStage'
import { Nametag } from '../../components/Nametag'
import { NoEchoMessage } from '../../components/NoEchoMessage'
import { ProgressPips } from '../../components/ProgressPips'
import { PromptCard } from '../../components/PromptCard'
import { RevealCard } from '../../components/RevealCard'
import { LoadingScreen } from '../../components/StatusPanel'
import type { DiveState } from '../../features/dive/diveMachine'
import { useCountdown } from '../../features/dive/useCountdown'
import { useDive } from '../../features/dive/useDive'
import { formatDepth } from '../../lib/tiers'

function readAutoStart(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as { autoStart?: unknown }).autoStart === true
}

export function DiveRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const { state, countdownLeft, submit, start, descend, retry } = useDive(readAutoStart(location.state))

  useEffect(() => {
    if (state.phase === 'needs_join') navigate('/', { replace: true })
    else if (state.phase === 'closed') navigate('/closed', { replace: true })
    else if (state.phase === 'finished') navigate('/results', { replace: true })
  }, [state.phase, navigate])

  if (state.phase === 'error' && state.error) return <ErrorScreen code={state.error} onRetry={retry} />
  if (state.phase === 'loading' || state.phase === 'needs_join' || state.phase === 'closed' || state.phase === 'finished') {
    return <LoadingScreen />
  }

  return (
    <>
      <DepthGauge depthM={state.depthM} />
      <main className="relative z-10 mx-auto flex min-h-[min(950px,var(--app-safe-height))] w-full max-w-[882px] flex-col px-4 pb-6 sm:px-6 lg:px-0">
        <Hud state={state} />
        <DiveBody state={state} countdownLeft={countdownLeft} submit={submit} start={start} descend={descend} />
      </main>
    </>
  )
}

function Hud({ state }: { state: DiveState }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 sm:h-[60px] [@media(max-height:520px)]:h-12">
      <Nametag>
        <span className="sr-only">Depth </span>
        <span className="font-mono tabular">
          <DiveTotal value={state.depthM} format={formatDepth} />
        </span>
      </Nametag>
      <ProgressPips pips={state.pips} current={state.round} />
      <Nametag>
        <span className="font-mono tabular">
          <DiveTotal value={state.score} format={String} />
          <span className="text-mute">/{state.maxScore}</span>
        </span>
        <span className="sr-only"> points</span>
      </Nametag>
    </header>
  )
}

interface DiveBodyProps {
  state: DiveState
  countdownLeft: number | null
  submit: (answer: string) => void
  start: () => void
  descend: () => void
}

function DiveBody({ state, countdownLeft, submit, start, descend }: DiveBodyProps) {
  const live = state.phase === 'countdown' || state.phase === 'answering' || state.phase === 'checking'
  const clock = useCountdown(state.prompt, live)
  const lastRound = state.round >= state.roundCount
  const preparing = state.phase === 'starting' && countdownLeft !== null

  if (state.phase === 'reveal' && state.reveal) {
    return (
      <>
        <RevealCard reveal={state.reveal} roundCount={state.roundCount} promptText={state.prompt?.text ?? null} />
        <Stage slug={state.figpalSlug} />
        <nav className="flex justify-center pt-2">
          <FigButton icon={lastRound ? 'up' : 'down'} onClick={descend} ref={focusAdvance}>
            {lastRound ? 'Surface' : 'Descend'}
          </FigButton>
        </nav>
      </>
    )
  }

  if (state.phase === 'between' || (state.phase === 'starting' && !preparing)) {
    const waiting = state.phase === 'starting'
    return (
      <>
        <section className="flex w-full flex-col gap-[5px]" aria-live="polite">
          <Nametag>
            Prompt {state.round} of {state.roundCount}
          </Nametag>
          <div className="flex min-h-[220px] flex-col justify-center gap-4 border border-line bg-paper px-6 py-10 sm:px-16">
            <p className="font-mono text-[32px] font-medium leading-[1.15] sm:text-[44px]">
              {waiting ? 'descending…' : 'Next prompt is waiting.'}
            </p>
            <p className="text-[18px] text-ink-soft sm:text-[20px]">
              {waiting ? 'Fetching your prompt from the deep.' : 'The clock starts 3 seconds after you descend.'}
            </p>
          </div>
        </section>
        <Stage slug={state.figpalSlug} />
        <nav className="flex justify-center pt-2">
          <FigButton icon="down" onClick={start} disabled={waiting} ref={focusAdvance}>
            Descend
          </FigButton>
        </nav>
      </>
    )
  }

  // countdown, answering, checking, finishing
  const prompt = state.prompt
  if (!prompt && !preparing) return null
  const pending = preparing || clock?.phase === 'countdown'
  const seconds = state.phase === 'finishing' ? 0 : (countdownLeft ?? clock?.displaySeconds ?? 0)
  let subline = 'Rarer answers dive deeper'
  if (pending) subline = `The clock starts in ${seconds}`
  else if (state.phase === 'checking') subline = 'checking the depths…'
  else if (state.phase === 'finishing') subline = 'time’s up · surfacing…'

  const inputEnabled = state.phase === 'answering'

  return (
    <>
      <PromptCard
        key={state.round}
        round={state.round}
        roundCount={state.roundCount}
        theme={pending ? '' : (prompt?.theme ?? '')}
        text={pending ? 'Descending…' : (prompt?.text ?? '')}
        subline={subline}
      />
      <Stage slug={state.figpalSlug} />
      <div className="flex flex-col gap-1">
        <NoEchoMessage input={state.noEcho} attempt={state.attempt} />
        <AnswerInput
          resetKey={`${state.round}-${state.attempt}`}
          disabled={!inputEnabled}
          checking={state.phase === 'checking'}
          seconds={seconds}
          pending={pending}
          fractionLeft={state.phase === 'finishing' ? 0 : (clock?.fractionLeft ?? 1)}
          onSubmit={submit}
        />
      </div>
    </>
  )
}

function focusAdvance(button: HTMLButtonElement | null) {
  button?.focus({ preventScroll: true })
}

function Stage({ slug }: { slug: string }) {
  return (
    <div className="flex flex-1 items-center justify-center py-2 sm:py-4 [@media(max-height:520px)]:py-0">
      <div className="hidden sm:[@media(min-height:761px)]:block">
        <FigPalStage slug={slug} width={120} />
      </div>
    </div>
  )
}
