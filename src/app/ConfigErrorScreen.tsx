import { StatusPanel } from '../components/StatusPanel'

/** Shown by a production build that was deployed without its Supabase env vars. */
export function ConfigErrorScreen({ missing }: { missing: readonly string[] }) {
  return (
    <StatusPanel
      tag="Setup needed"
      title="Figillion is not connected to its game server."
      body={
        <div className="flex flex-col gap-3">
          <p>This build is missing its configuration. Set these environment variables and redeploy:</p>
          <ul className="flex flex-col gap-1">
            {missing.map((name) => (
              <li key={name} className="w-fit border border-line bg-canvas px-2 py-1 font-mono text-[15px] text-ink">
                {name}
              </li>
            ))}
          </ul>
        </div>
      }
      stamp="thumbs-down"
      figpal="cursor"
    />
  )
}
