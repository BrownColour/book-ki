import { useState, useEffect, useRef } from 'react'
import { useAutocorrect } from '@/hooks/useAutocorrect'

interface AutocorrectInputProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  extraWords?: string[]
}

export default function AutocorrectInput({
  value,
  onChange,
  placeholder = 'What did you buy?',
  extraWords = [],
}: AutocorrectInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const { getSuggestions } = useAutocorrect(extraWords)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (value.length >= 2) {
        setSuggestions(getSuggestions(value))
      } else {
        setSuggestions([])
      }
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const applySuggestion = (word: string) => {
    onChange(word)
    setSuggestions([])
  }

  return (
    <div>
      <input
        type="text"
        className="input-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        style={{ fontSize: 17, fontWeight: 500 }}
      />
      {suggestions.length > 0 && (
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-3)',
              alignSelf: 'center',
              marginRight: 2,
            }}
          >
            Did you mean:
          </span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => applySuggestion(s)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                background: 'var(--bg-3)',
                border: '1px solid var(--accent)',
                color: 'var(--accent)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                letterSpacing: '0.01em',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
