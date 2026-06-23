export function nowIso(): string {
  return new Date().toISOString()
}

export function getLocalDayBounds(value: Date): {
  start: string
  end: string
} {
  const start = new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  )
  const end = new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate() + 1,
  )
  return { start: start.toISOString(), end: end.toISOString() }
}
