import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CanvasCursors } from '../../components/CanvasCursors'
import { CanvasPlayerCursor } from '../../components/CanvasPlayerCursor'
import { FigButton } from '../../components/FigButton'
import { FigPalAvatar } from '../../components/FigPalAvatar'
import { FigPalPicker } from '../../components/FigPalPicker'
import { FigPalStage } from '../../components/FigPalStage'
import { SelectionFrame } from '../../components/SelectionFrame'
import { Stamp } from '../../components/Stamp'
import { LoadingScreen } from '../../components/StatusPanel'
import { ensureSession, getMyProgress, joinGame } from '../../lib/api'
import { describeError, toApiError, type ApiErrorCode } from '../../lib/errors'
import { DEFAULT_FIGPAL, getFigPal } from '../../lib/figpals'
import { DISPLAY_NAME_MAX, cleanDisplayName } from '../../lib/names'
import { loadDraft, saveDraft } from '../../lib/playerDraft'
import { gameSlug } from '../../lib/supabase'
import type { GameInfo, PlayerSummary } from '../../lib/types'

type Boot = { status: 'loading' } | { status: 'ready'; game: GameInfo | null; player: PlayerSummary | null }

/** Home (106:9171) and FigPal selection (10:8249): name, FigPal, Begin Descent. */
export function HomeRoute() {
  const navigate = useNavigate()
  const [boot, setBoot] = useState<Boot>({ status: 'loading' })
  const [name, setName] = useState(() => loadDraft().name)
  const [figpal, setFigpal] = useState(() => loadDraft().figpal ?? DEFAULT_FIGPAL)
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerTrigger = useRef<HTMLButtonElement>(null)
  const returnPickerFocus = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiErrorCode | 'name_required' | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await ensureSession()
        const { data } = await getMyProgress(gameSlug())
        if (cancelled) return
        if (data.player?.finished) {
          navigate('/results', { replace: true })
          return
        }
        if (data.game.status !== 'open') {
          navigate('/closed', { replace: true })
          return
        }
        if (data.player) {
          setName(data.player.display_name)
          setFigpal(getFigPal(data.player.figpal_slug).slug)
        }
        setBoot({ status: 'ready', game: data.game, player: data.player })
      } catch (err) {
        if (cancelled) return
        setError(toApiError(err).code)
        setBoot({ status: 'ready', game: null, player: null })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [navigate])

  const closePicker = useCallback(() => setPickerOpen(false), [])

  useEffect(() => {
    if (pickerOpen || !returnPickerFocus.current) return
    returnPickerFocus.current = false
    pickerTrigger.current?.focus({ preventScroll: true })
  }, [pickerOpen])

  const begin = async (event: FormEvent) => {
    event.preventDefault()
    const displayName = cleanDisplayName(name)
    if (!displayName) {
      setError('name_required')
      return
    }
    setBusy(true)
    setError(null)
    saveDraft({ name: displayName, figpal })
    try {
      await ensureSession()
      await joinGame(gameSlug(), displayName, figpal)
      navigate('/dive', { state: { autoStart: true } })
    } catch (err) {
      const code = toApiError(err).code
      if (code === 'game_not_open') navigate('/closed')
      else setError(code)
      setBusy(false)
    }
  }

  if (boot.status === 'loading') return <LoadingScreen label="surfacing" />

  const resuming = Boolean(boot.player && boot.player.rounds_resolved > 0)
  const roundCount = boot.game?.round_count ?? 5
  const seconds = boot.game?.prompt_seconds ?? 25
  const errorCopy =
    error === 'name_required' ? 'Type a name first. It shows on the leaderboard.' : error ? describeError(error).body : null

  return (
    <main className="relative mx-auto min-h-[var(--app-safe-height)] w-full max-w-[1280px] overflow-hidden px-4 sm:px-8">
      <HomeStickers pickerOpen={pickerOpen} />
      {!pickerOpen ? <CanvasPlayerCursor nickname={name} /> : null}
      {!pickerOpen ? <CanvasCursors scene="home" layout="margins" /> : null}

      <div
        className={`relative z-10 mx-auto flex min-h-[var(--app-safe-height)] w-full flex-col items-center py-10 xl:py-0 ${
          pickerOpen ? 'xl:grid xl:grid-cols-[minmax(0,1fr)_583px] xl:items-center xl:gap-10' : ''
        }`}
      >
        <div className={`w-full flex-col items-center ${pickerOpen ? 'hidden xl:order-1 xl:flex' : 'flex'}`}>
          {/* title block (108:10077) */}
          <header
            className={`flex w-full max-w-[476px] flex-col items-center gap-3 text-center leading-[normal] xl:pt-[118px] ${pickerOpen ? 'xl:hidden' : ''}`}
          >
            <p className="text-[28px] tracking-[-0.025em] sm:text-[40px]">Figma for Edu</p>
            <h1 className="font-mono text-[48px] leading-[normal] tracking-[0.02em] sm:text-[80px]">FIGILLION</h1>
            <p className="text-[16px] text-[#3f3f3f] sm:whitespace-nowrap sm:text-[20px]">
              {roundCount} Prompts · {seconds} Seconds · Rarer Answers Dive Deeper
            </p>
          </header>

          <form onSubmit={begin} className={`flex w-full flex-col items-center ${pickerOpen ? 'xl:pt-[260px]' : ''}`} noValidate>
            <div className="relative mt-5 w-full sm:mt-14 xl:mt-[62px]">
              <FigPalStage
                slug={figpal}
                bob={pickerOpen}
                avatar={pickerOpen ? undefined : (
                  <button
                    type="button"
                    ref={pickerTrigger}
                    onClick={() => {
                      returnPickerFocus.current = true
                      setPickerOpen(true)
                    }}
                    aria-label={`Change FigPal (now ${getFigPal(figpal).name})`}
                    aria-expanded={pickerOpen}
                    className="group relative flex cursor-pointer flex-col items-center rounded-[12px] outline-offset-4 focus-visible:outline-2 focus-visible:outline-select"
                  >
                    <FigPalAvatar slug={figpal} width={144} className="transition-transform duration-150 group-hover:-translate-y-1" decorative />
                    <span className="relative flex min-h-9 items-center gap-1.5 rounded-tag border border-[#cecece] bg-paper px-2.5 text-[14px] font-medium whitespace-nowrap text-ink-soft group-hover:border-select group-hover:text-ink">
                      Change FigPal
                      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                        <path d="m2 4 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </button>
                )}
              />
              {!pickerOpen ? <CanvasCursors scene="home" layout="compact" /> : null}
            </div>

            <div className="mt-2 flex w-full max-w-[420px] flex-col items-center gap-4 sm:mt-0 sm:gap-6">
              <SelectionFrame className="w-full max-w-[340px]">
                <label htmlFor="display-name" className="sr-only">
                  Your name
                </label>
                <input
                  id="display-name"
                  name="display-name"
                  type="text"
                  autoComplete="nickname"
                  maxLength={DISPLAY_NAME_MAX}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="YOUR NAME"
                  aria-invalid={error === 'name_required'}
                  aria-describedby={errorCopy ? 'home-error' : undefined}
                  className="h-[51px] w-full bg-paper px-5 text-center font-mono text-[20px] outline-none placeholder:text-ink-soft"
                />
              </SelectionFrame>

              <FigButton type="submit" icon="down" disabled={busy}>
                {busy ? 'Descending' : resuming ? 'Continue descent' : 'Begin descent'}
              </FigButton>

              <p id="home-error" role="alert" className="min-h-6 max-w-[420px] text-center text-[15px] text-[#c2410c]">
                {errorCopy}
              </p>
            </div>
          </form>
        </div>

        {pickerOpen ? (
          <div className="w-full max-w-[583px] xl:order-2">
            <FigPalPicker selected={figpal} onSelect={setFigpal} onClose={closePicker} />
          </div>
        ) : null}
      </div>
    </main>
  )
}

/** Oscar's scattered stickers. Decorative; desktop and tablet only. */
function HomeStickers({ pickerOpen }: { pickerOpen: boolean }) {
  if (pickerOpen) {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
        <Stamp kind="question" size={70} rotate={-8} className="absolute left-[132px] top-[137px]" />
        <Stamp kind="star" size={84} rotate={6} className="absolute left-[180px] top-[150px]" />
        <Stamp kind="thumbs-up" size={64} rotate={-10} className="absolute left-[72px] top-[238px]" />
        <Stamp kind="heart" size={92} rotate={10} className="absolute left-[535px] top-[540px]" />
        <Stamp kind="plus-one" size={70} rotate={-6} className="absolute left-[500px] top-[592px]" />
        <Stamp kind="dot" size={70} className="absolute left-[580px] top-[615px]" />
      </div>
    )
  }
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[11] hidden md:block">
      <Stamp hoverable kind="question" size={88} rotate={-10} className="absolute left-[7%] top-[104px] xl:left-[258px] xl:top-[110px]" />
      <Stamp hoverable kind="star" size={84} rotate={8} className="absolute left-[2%] top-[176px] xl:left-[333px] xl:top-[180px]" />
      <Stamp hoverable kind="plus-one" size={66} rotate={-6} className="absolute left-[9%] top-[233px] xl:left-[138px] xl:top-[218px]" />
      <Stamp hoverable kind="heart" size={88} rotate={14} className="absolute right-[6%] top-[128px] xl:left-[858px] xl:right-auto xl:top-[118px]" />
      <Stamp hoverable kind="thumbs-up" size={78} rotate={-8} className="absolute right-[5%] top-[221px] xl:left-[970px] xl:right-auto xl:top-[198px]" />
      <Stamp hoverable kind="dot" size={74} rotate={0} className="absolute right-[1%] top-[176px] xl:left-[1080px] xl:right-auto xl:top-[160px]" />
    </div>
  )
}
