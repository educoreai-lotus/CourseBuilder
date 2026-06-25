import { syncLegacyUserId } from '../syncLegacyUserId.js'

describe('syncLegacyUserId', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('overwrites user_id with authenticated directory user id', () => {
    localStorage.setItem('user_id', '50a630f4-826e-45aa-8f70-653e5e592fc3')

    syncLegacyUserId('dir-user-123')

    expect(localStorage.getItem('user_id')).toBe('dir-user-123')
  })

  test('does nothing when directoryUserId is missing', () => {
    localStorage.setItem('user_id', 'legacy-id')

    syncLegacyUserId(null)

    expect(localStorage.getItem('user_id')).toBe('legacy-id')
  })
})
