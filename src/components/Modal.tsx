import { useEffect, type ReactNode } from 'react'
import { Icon } from './Icon'

export function Modal({
  title,
  onClose,
  children,
  size = 'normal'
}: {
  title: string
  onClose: () => void
  children: ReactNode
  size?: 'normal' | 'wide'
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal-sheet ${size === 'wide' ? 'modal-sheet--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-grabber" />
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button quiet" aria-label="关闭" onClick={onClose}><Icon name="close" /></button>
        </div>
        {children}
      </section>
    </div>
  )
}
