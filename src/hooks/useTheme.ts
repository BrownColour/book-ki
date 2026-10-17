import { useEffect, useState } from 'react'

export function useTheme() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('book-theme')
    const dark = saved !== null ? saved === 'dark' : true
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('book-theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  }

  return { isDark, toggle }
}
