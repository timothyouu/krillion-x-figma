import type { ReactNode } from 'react'

interface SelectionFrameProps {
  children: ReactNode
  /** Hide the frame without changing layout (e.g. unselected picker items). */
  visible?: boolean
  /** Corner handles: the "this is selected on the canvas" signal. */
  handles?: boolean
  className?: string
}

function Handle({ position }: { position: string }) {
  return <span aria-hidden className={`selection-handle absolute size-2 border border-select bg-paper ${position}`} />
}

/** Figma's selection box: 2px blue frame with square handles. Used for the active thing. */
export function SelectionFrame({ children, visible = true, handles = true, className = '' }: SelectionFrameProps) {
  return (
    <div className={`relative ${className}`}>
      <div className={`selection-box h-full border-2 ${visible ? 'border-select' : 'border-transparent'}`}>{children}</div>
      {visible && handles ? (
        <>
          <Handle position="-left-[3px] -top-[3px]" />
          <Handle position="-right-[3px] -top-[3px]" />
          <Handle position="-bottom-[3px] -left-[3px]" />
          <Handle position="-bottom-[3px] -right-[3px]" />
        </>
      ) : null}
    </div>
  )
}
