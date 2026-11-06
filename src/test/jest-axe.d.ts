import 'vitest'

declare module 'vitest' {
  // jest-axe extends the Vitest matcher set at runtime.
  interface Assertion<T = any> {
    toHaveNoViolations(): T
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void
  }
}
