'use client'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="error-screen" style={{ padding: '80px 24px', textAlign: 'center' }}>
      <i style={{ fontSize: 40 }}>😵</i>
      <h2 style={{ margin: '14px 0 6px' }}>Что-то пошло не так</h2>
      <p className="dim" style={{ marginBottom: 20 }}>{error.message || 'Произошла непредвиденная ошибка.'}</p>
      <button className="btn btn-p btn-w" onClick={reset}>Попробовать снова</button>
    </div>
  )
}