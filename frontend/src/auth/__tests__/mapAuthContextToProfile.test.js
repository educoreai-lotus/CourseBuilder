import { mapAuthContextToProfile, mapAuthContextToUiRole } from '../mapAuthContextToProfile.js'

describe('mapAuthContextToProfile', () => {
  test('maps directory user id without inventing a display name', () => {
    const profile = mapAuthContextToProfile({
      directoryUserId: 'dir-user-123',
      userId: 'dir-user-123',
      id: 'dir-user-123',
      role: 'learner',
      primaryRole: 'REGULAR_EMPLOYEE',
      isTrainer: false,
      isSystemAdmin: false,
      authenticated: true
    })

    expect(profile.id).toBe('dir-user-123')
    expect(profile.directoryUserId).toBe('dir-user-123')
    expect(profile.primaryRole).toBe('REGULAR_EMPLOYEE')
    expect(profile.name).toBeNull()
  })

  test('does not use Jasmine hardcoded id', () => {
    const profile = mapAuthContextToProfile({
      directoryUserId: 'dir-user-123',
      role: 'learner',
      authenticated: true
    })

    expect(profile.id).not.toBe('50a630f4-826e-45aa-8f70-653e5e592fc3')
  })
})

describe('mapAuthContextToUiRole', () => {
  test('maps learner role', () => {
    expect(mapAuthContextToUiRole({ role: 'learner' })).toBe('learner')
  })

  test('maps admin to trainer UI role', () => {
    expect(mapAuthContextToUiRole({ role: 'admin' })).toBe('trainer')
  })
})
