import { useMemo } from 'react'
import Fuse from 'fuse.js'
import { GROCERY_DICTIONARY, CORRECTIONS_MAP } from '@/lib/dictionary'

export function useAutocorrect(extraWords: string[] = []) {
  const allWords = useMemo(() => {
    const combined = [...new Set([...GROCERY_DICTIONARY, ...extraWords])]
    return combined
  }, [extraWords])

  const fuse = useMemo(
    () =>
      new Fuse(allWords, {
        includeScore: true,
        threshold: 0.45,
        minMatchCharLength: 2,
        distance: 100,
      }),
    [allWords]
  )

  const getSuggestions = (input: string): string[] => {
    if (!input || input.length < 2) return []

    const lower = input.toLowerCase().trim()

    // Check direct correction map first
    if (CORRECTIONS_MAP[lower]) {
      return [CORRECTIONS_MAP[lower]]
    }

    // Exact match - no suggestions needed
    if (allWords.includes(lower)) return []

    const results = fuse.search(lower)
    return results
      .filter((r) => r.score !== undefined && r.score < 0.4)
      .slice(0, 4)
      .map((r) => r.item)
  }

  return { getSuggestions }
}
