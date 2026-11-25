import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FigButton } from '../../components/FigButton'
import { FigPalAvatar } from '../../components/FigPalAvatar'
import { FigPalPicker } from '../../components/FigPalPicker'
import { FigPalStage } from '../../components/FigPalStage'
import { Nametag } from '../../components/Nametag'
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
    <main className="relative mx-auto min-h-dvh w-full max-w-[1280px] overflow-hidden px-4 sm:px-8">
      <HomeStickers pickerOpen={pickerOpen} />

      <div
        className={`relative z-10 mx-auto flex min-h-dvh w-full flex-col items-center py-10 lg:py-0 ${
          pickerOpen ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_583px] lg:items-center lg:gap-10' : ''
        }`}
      >
        <div className={`flex w-full flex-col items-center ${pickerOpen ? 'lg:order-1' : ''}`}>
          {/* title block (108:10077) */}
          {/* Oscar's block is 476 px wide with the 20 px line set on one row; Geist sets wider than
              Figma Sans, so the line may overhang the block, as it does in his frame. */}
          <header
            className={`flex w-full max-w-[476px] flex-col items-center gap-3 text-center leading-[normal] lg:pt-[118px] ${pickerOpen ? 'lg:hidden' : ''}`}
          >
            <p className="text-[28px] sm:text-[40px]">Figma for Edu</p>
            <h1 className="font-mono text-[48px] leading-[normal] tracking-[0.02em] sm:text-[80px]">FIGILLION</h1>
            <p className="text-[16px] text-[#3f3f3f] sm:whitespace-nowrap sm:text-[20px]">
              {roundCount} Prompts · {seconds} Seconds · Rarer Answers Dive Deeper
            </p>
          </header>

          <form onSubmit={begin} className={`flex w-full flex-col items-center ${pickerOpen ? 'lg:pt-[260px]' : ''}`} noValidate>
            <div className="mt-10 sm:mt-14 lg:mt-[62px]">
              <FigPalStage slug={figpal} />
            </div>

            <div className="mt-2 flex w-full max-w-[420px] flex-col items-center gap-6 sm:mt-0">
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
          <div className="mt-6 w-full max-w-[583px] lg:order-2 lg:mt-0">
            <FigPalPicker selected={figpal} onSelect={setFigpal} onClose={closePicker} />
          </div>
        ) : null}
      </div>

      {!pickerOpen ? (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label={`Change FigPal (now ${getFigPal(figpal).name})`}
          className="absolute right-4 top-4 z-20 flex h-[97.68px] w-[81.4px] items-center justify-center rounded-tile border border-select-deep bg-select pb-[5px] transition-transform duration-150 hover:-translate-y-0.5 sm:right-8 lg:left-[1155px] lg:right-auto lg:top-[342px]"
        >
          <FigPalAvatar slug={figpal} width={74} decorative />
          <Nametag className="absolute -bottom-3 left-1/2 -translate-x-1/2 py-[3px]! text-[12px]!">change</Nametag>
        </button>
      ) : null}
    </main>
  )
}

/** Oscar's scattered stickers. Decorative; desktop and tablet only. */
function HomeStickers({ pickerOpen }: { pickerOpen: boolean }) {
  if (pickerOpen) {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
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
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
      <Stamp kind="question" size={88} rotate={-10} className="absolute left-[18%] top-[110px] lg:left-[258px]" />
      <Stamp kind="star" size={84} rotate={8} className="absolute left-[25%] top-[180px] lg:left-[333px]" />
      <Stamp kind="plus-one" size={66} rotate={-6} className="absolute left-[10%] top-[218px] lg:left-[138px]" />
      <Stamp kind="heart" size={88} rotate={14} className="absolute right-[22%] top-[118px] lg:left-[858px] lg:right-auto" />
      <Stamp kind="thumbs-up" size={78} rotate={-8} className="absolute right-[15%] top-[198px] lg:left-[970px] lg:right-auto" />
      <Stamp kind="dot" size={74} rotate={0} className="absolute right-[8%] top-[160px] lg:left-[1080px] lg:right-auto" />
    </div>
  )
}
