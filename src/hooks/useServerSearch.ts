import { useState, useEffect } from 'react'

const MIN_CHARS = 3
const DEBOUNCE_MS = 400

/**
 * Server-side search hook with 3-char minimum and 400ms debounce.
 * inputValue - the raw text in the search input (bind to SearchWithFilters value)
 * debouncedSearch - the value to pass to API calls (empty string if < MIN_CHARS)
 */
export function useServerSearch(initialValue = '') {
  const [inputValue, setInputValue] = useState(initialValue)
  const [debouncedSearch, setDebouncedSearch] = useState(
    initialValue.length >= MIN_CHARS ? initialValue : ''
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(inputValue.length >= MIN_CHARS ? inputValue : '')
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [inputValue])

  return { inputValue, setInputValue, debouncedSearch }
}
