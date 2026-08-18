'use client'

interface DateInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
}

export function DateInput({ value, onChange, placeholder = 'ДД.ММ.ГГГГ', autoFocus }: DateInputProps) {
  const handle = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    let out = digits
    if (digits.length >= 3) out = `${digits.slice(0, 2)}.${digits.slice(2)}`
    if (digits.length >= 5) out = `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
    onChange(out)
  }

  return (
    <input
      className="input"
      inputMode="numeric"
      placeholder={placeholder}
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => handle(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Backspace' && value.length > 0 && value.endsWith('.')) {
          onChange(value.slice(0, -1))
          e.preventDefault()
        }
      }}
    />
  )
}
