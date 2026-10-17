import { useEffect } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
}

export default function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 300,
        background: type === 'success' ? 'var(--accent)' : '#c0392b',
        color: 'white',
        padding: '12px 20px',
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 500,
        fontFamily: 'DM Sans, sans-serif',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        maxWidth: 'calc(100vw - 32px)',
        textAlign: 'center',
        animation: 'slideDown 0.2s ease',
        whiteSpace: 'nowrap',
      }}
    >
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      {message}
    </div>
  )
}
