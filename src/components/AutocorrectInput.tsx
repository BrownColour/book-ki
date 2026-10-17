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
}: AutocorrectInputProps) {
  return (
    <input
      type="text"
      className="input-field"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      style={{ fontSize: 17, fontWeight: 500 }}
    />
  )
}
