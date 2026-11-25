import { Link } from 'react-router-dom'
import { describeError, type ApiErrorCode } from '../lib/errors'
import { FigButton } from './FigButton'
import { StatusPanel } from './StatusPanel'

interface ErrorScreenProps {
  code: ApiErrorCode
  onRetry?: () => void
}

export function ErrorScreen({ code, onRetry }: ErrorScreenProps) {
  const copy = describeError(code)
  return (
    <StatusPanel
      tag="Lost signal"
      title={copy.title}
      body={<p>{copy.body}</p>}
      stamp="thumbs-down"
      figpal="cloud"
      actions={
        <>
          {onRetry ? (
            <FigButton icon="down" onClick={onRetry}>
              Try again
            </FigButton>
          ) : null}
          <Link
            to="/"
            className="inline-flex items-center rounded-button border border-line bg-paper p-3 font-mono text-[20px] uppercase leading-none hover:border-select"
          >
            Back to start
          </Link>
        </>
      }
    />
  )
}
