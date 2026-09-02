import { beforeEach, describe, expect, it } from 'vitest'
import { getStoredUser, getToken, setSession } from './api.js'

describe('setSession', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it.each([undefined, null, '', '   ', 123])('rejects invalid token %s without storing session data', (token) => {
    expect(() => setSession(token, { id: 1 })).toThrow(TypeError)
    expect(getToken()).toBeNull()
    expect(getStoredUser()).toBeNull()
  })

  it('preserves valid token and user storage contracts', () => {
    const user = { id: 1 }

    setSession('valid-token', user)

    expect(getToken()).toBe('valid-token')
    expect(getStoredUser()).toEqual(user)
  })
})
