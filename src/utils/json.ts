import type { Result } from './result'

export function parseJson(value: string): Result<unknown, SyntaxError> {
  try {
    return { ok: true, value: JSON.parse(value) as unknown }
  } catch (error: unknown) {
    return {
      ok: false,
      error:
        error instanceof SyntaxError
          ? error
          : new SyntaxError('The value is not valid JSON.'),
    }
  }
}
