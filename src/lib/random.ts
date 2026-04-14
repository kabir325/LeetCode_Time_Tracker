export function randomInt(maxExclusive: number) {
  if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) return 0
  return Math.floor(Math.random() * maxExclusive)
}

export function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined
  return items[randomInt(items.length)]
}

