import { useEffect, useRef, type CSSProperties } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CanvasCursors, type CursorReaction } from '../../components/CanvasCursors'
import { CanvasPlayerCursor } from '../../components/CanvasPlayerCursor'
import { AnswerInput } from '../../components/AnswerInput'
import { DepthGauge } from '../../components/DepthGauge'
import { DiveCanvas } from '../../components/DiveCanvas'
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
import { DESCENT_MS, sinkDurationMs } from '../../features/dive/diveMotion'
import type { DiveState } from '../../features/dive/diveMachine'
import { useCountdown } from '../../features/dive/useCountdown'
import { useDive } from '../../features/dive/useDive'
import { primeResults } from '../../features/results/useResults'
import { formatDepth } from '../../lib/tiers'
import { loadResultsRoute } from './lazyRoutes'

function readAutoStart(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as { autoStart?: unknown }).autoStart === true
}

function guessReaction(state: DiveState): CursorReaction | undefined {
  const { reveal, round, attempt, noEcho, phase } = state
  if (phase === 'reveal' && reveal) {
    const tier = reveal.tier ?? 'no_echo'
    const kind = !reveal.accepted ? 'timeout' : reveal.points >= 60 ? 'rare' : 'landed'
    return { id: `reveal-${round}`, kind, tier }
  }
  if (phase === 'answering' && noEcho !== null && attempt > 0) {
    return { id: `miss-${round}-${attempt}`, kind: 'no-echo', tier: 'no_echo' }
  }
}

export function DiveRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const surfaced = useRef(false)
  const { state, countdownLeft, submit, start, descend, retry } = useDive(readAutoStart(location.state))
  const lastReveal = state.phase === 'reveal' && state.round >= state.roundCount

  // The server marks the dive finished when the last round resolves. Fetch the results route and
  // data during the last reveal, so Surface goes straight to the rising results page.
  useEffect(() => {
    if (!lastReveal) return
    void loadResultsRoute()
    primeResults()
  }, [lastReveal])

  useEffect(() => {
    if (state.phase === 'needs_join') navigate('/', { replace: true })
    else if (state.phase === 'closed') navigate('/closed', { replace: true })
    else if (state.phase === 'finished') {
      navigate('/results', { replace: true, state: surfaced.current ? { surfaced: true } : null })
    }
  }, [state.phase, navigate])

  // Keep the canvas (not a loading screen) for the frame before /results takes over the surfacing.
  if (state.phase === 'finished' && surfaced.current) return <DiveCanvas depthM={state.depthM} round={state.round} duration={DESCENT_MS} />
  if (state.phase === 'error' && state.error) return <ErrorScreen code={state.error} onRetry={retry} />
  if (state.phase === 'loading' || state.phase === 'needs_join' || state.phase === 'closed' || state.phase === 'finished') {
    return <LoadingScreen />
  }

  const reaction = guessReaction(state)
  const sinkTime = state.reveal?.accepted ? sinkDurationMs(state.reveal.tier) : 0
  const isDescending = state.phase === 'countdown' ||
    (state.phase === 'starting' && state.prompt === null && state.countdownSeconds > 0)
  const cue = sinkTime > 0 ? 'land-' + state.round : isDescending ? 'descend-' + state.round : undefined

  function advance() {
    surfaced.current = state.round === state.roundCount
    descend()
  }

  return (
    <div className="overflow-x-clip">
      <DiveCanvas
        depthM={state.depthM}
        round={state.round}
        duration={sinkTime || DESCENT_MS}
        cue={cue}
        descending={isDescending}
        playerName={state.displayName}
        roundCount={state.roundCount}
        previous={state.previous}
      />
      <DepthGauge depthM={state.depthM} duration={sinkTime || DESCENT_MS} />
      <CanvasCursors scene="dive" layout="margins" reaction={reaction} />
      <CanvasPlayerCursor nickname={state.displayName} />
      <main
        className="relative z-10 mx-auto flex min-h-[min(950px,var(--app-safe-height))] w-full max-w-[882px] flex-col px-4 pb-6 sm:px-6 lg:px-0"
        style={{ '--descent-duration': DESCENT_MS + 'ms' } as CSSProperties}
      >
        <Hud state={state} motionDuration={sinkTime || DESCENT_MS} />
        <DiveBody state={state} countdownLeft={countdownLeft} sinkTime={sinkTime} reaction={reaction} submit={submit} start={start} descend={advance} />
      </main>
    </div>
  )
}

function Hud({ state, motionDuration }: { state: DiveState; motionDuration: number }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 sm:h-[60px] [@media(max-height:520px)]:h-12">
      <Nametag>
        <span className="sr-only">Depth </span>
        <span className="font-mono tabular">
          <DiveTotal value={state.depthM} format={formatDepth} duration={motionDuration} />
        </span>
      </Nametag>
      <ProgressPips pips={state.pips} current={state.round} />
      <Nametag>
        <span className="font-mono tabular">
          <DiveTotal value={state.score} format={String} duration={motionDuration} />
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
  sinkTime: number
  reaction?: CursorReaction
  submit: (answer: string) => void
  start: () => void
  descend: () => void
}

function DiveBody({ state, countdownLeft, sinkTime, reaction, submit, start, descend }: DiveBodyProps) {
  const live = state.phase === 'countdown' || state.phase === 'answering' || state.phase === 'checking'
  const clock = useCountdown(state.prompt, live)
  const lastRound = state.round >= state.roundCount

  if (state.phase === 'reveal' && state.reveal) {
    return (
      <>
        <RevealCard reveal={state.reveal} roundCount={state.roundCount} promptText={state.prompt?.text ?? null} figpalSlug={state.figpalSlug} />
        <Stage reaction={reaction} slug={sinkTime ? state.figpalSlug : undefined} sinkTime={sinkTime} sinkDepth={state.reveal.depthM} />
        <nav className="flex justify-center pt-2">
          <FigButton icon={lastRound ? 'up' : 'down'} onClick={descend} ref={focusAdvance}>
            {lastRound ? 'Surface' : 'Descend'}
          </FigButton>
        </nav>
      </>
    )
  }

  if (state.phase === 'between') {
    return (
      <>
        <section className="flex w-full flex-col gap-[5px]" aria-live="polite">
          <Nametag>
            Prompt {state.round} of {state.roundCount}
          </Nametag>
          <div className="flex min-h-[220px] flex-col justify-center gap-4 border border-line bg-paper px-6 py-10 sm:px-16">
            <p className="font-mono text-[32px] font-medium leading-[1.15] sm:text-[44px]">Next prompt is waiting.</p>
            <p className="text-[18px] text-ink-soft sm:text-[20px]">The clock starts 3 seconds after you descend.</p>
          </div>
        </section>
        <Stage slug={state.figpalSlug} />
        <nav className="flex justify-center pt-2">
          <FigButton icon="down" onClick={start} ref={focusAdvance}>
            Descend
          </FigButton>
        </nav>
      </>
    )
  }

  // starting (countdown, then fetching the prompt), countdown, answering, checking, finishing
  const prompt = state.prompt
  const starting = state.phase === 'starting'
  if (!prompt && !starting) return null
  const pending = starting || clock?.phase === 'countdown'
  let seconds = clock?.displaySeconds ?? 0
  if (state.phase === 'finishing') seconds = 0
  else if (starting && countdownLeft !== null) seconds = countdownLeft
  else if (starting && !prompt) seconds = state.countdownSeconds
  let subline = 'Rarer answers dive deeper'
  // Resuming after a refresh: the server clock is already running, so there is no countdown to show.
  const resuming = starting && prompt !== null && countdownLeft === null
  if (pending) subline = seconds > 0 && !resuming ? `The clock starts in ${seconds}` : 'Here it comes'
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
        descending={pending && !resuming && state.countdownSeconds > 0}
        text={pending ? 'Descending…' : (prompt?.text ?? '')}
        subline={subline}
      />
      <Stage slug={state.figpalSlug} descending={pending} reaction={reaction} aside={!pending} />
      <div className="flex flex-col gap-1">
        <NoEchoMessage input={state.noEcho} attempt={state.attempt} />
        <AnswerInput
          resetKey={`${state.round}-${state.attempt}`}
          disabled={!inputEnabled}
          checking={state.phase === 'checking'}
          seconds={seconds}
          pending={pending}
          expired={state.phase === 'finishing'}
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

interface StageProps {
  slug?: string
  reaction?: CursorReaction
  descending?: boolean
  /** The timed question is up: compact cursors step out of the way of the prompt and input. */
  aside?: boolean
  sinkTime?: number
  sinkDepth?: number
}

function Stage({ slug, reaction, descending = false, aside = false, sinkTime = 0, sinkDepth = 0 }: StageProps) {
  const sinking = sinkTime > 0
  const sinkStyle = sinking ? {
    '--figpal-distance': Math.min(120, 40 + sinkDepth * 0.08) + 'px',
    '--figpal-duration': sinkTime + 'ms',
  } as CSSProperties : undefined

  return (
    <div className={'relative flex min-h-4 flex-1 items-center justify-center py-2 sm:py-4 [@media(max-height:520px)]:py-0 ' + (sinking ? 'overflow-clip' : '')}>
      <CanvasCursors scene="dive" layout="compact" reaction={reaction} aside={aside} />
      {slug ? (
        <div
          className={'hidden sm:[@media(min-height:761px)]:block ' + (sinking ? 'dive-figpal-sink' : '')}
          style={sinkStyle}
        >
          <FigPalStage
            slug={slug}
            width={sinking ? 88 : 120}
            glow={!sinking}
            bob={!descending && !sinking}
            className={descending ? 'dive-figpal-descend' : ''}
          />
        </div>
      ) : null}
    </div>
  )
}
