import type { ReactNode } from 'react'
import { FigPalStage } from './FigPalStage'
import { Nametag } from './Nametag'
import { Stamp, type StampKind } from './Stamp'

interface StatusPanelProps {
  tag: string
  title: string
  body: ReactNode
  stamp?: StampKind
  figpal?: string
  actions?: ReactNode
}

/** Closed, error and config screens: a nametagged card in Oscar's canvas world. */
export function StatusPanel({ tag, title, body, stamp, figpal, actions }: StatusPanelProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[882px] flex-col items-center justify-center gap-10 px-4 py-12">
      {figpal ? <FigPalStage slug={figpal} width={112} glow={false} /> : null}
      <section className="flex w-full flex-col gap-[5px]" aria-labelledby="status-title">
        <Nametag>{tag}</Nametag>
        <div className="relative flex flex-col gap-4 border border-line bg-paper px-6 py-9 sm:px-12 sm:py-12">
          {stamp ? <Stamp kind={stamp} size={84} rotate={10} className="absolute right-6 top-6 hidden sm:block" /> : null}
          <h1 id="status-title" className="max-w-[560px] font-mono text-[32px] leading-[1.15] font-medium text-balance sm:text-[44px]">
            {title}
          </h1>
          <div className="max-w-[560px] text-[18px] text-ink-soft sm:text-[20px]">{body}</div>
          {actions ? <div className="mt-2 flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </section>
    </main>
  )
}

export function LoadingScreen({ label = 'panning' }: { label?: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6" aria-busy="true">
      <FigPalStage slug="figgy" width={112} glow={false} />
      <p className="font-mono text-[16px] uppercase tracking-wide text-ink-soft" role="status">
        {label}…
      </p>
    </main>
  )
}
