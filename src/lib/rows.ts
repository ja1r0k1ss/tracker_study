/** Dexie usa camelCase; Postgres, snake_case. Solo claves de primer nivel (status va como jsonb). */
export const toRow = (o: object) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`), v]))
export const fromRow = <T>(o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), v])) as T
