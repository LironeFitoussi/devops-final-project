import '@testing-library/jest-dom/vitest'

// Node 22+'s built-in `localStorage` global requires a `--localstorage-file`
// backing file or it throws; jsdom's own implementation can't override it
// because it's already defined on globalThis by the time jsdom runs. Replace
// it with a small in-memory polyfill for the test environment only.
class MemoryStorage {
  #store = new Map()

  getItem(key) {
    return this.#store.has(key) ? this.#store.get(key) : null
  }

  setItem(key, value) {
    this.#store.set(key, String(value))
  }

  removeItem(key) {
    this.#store.delete(key)
  }

  clear() {
    this.#store.clear()
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true,
})
