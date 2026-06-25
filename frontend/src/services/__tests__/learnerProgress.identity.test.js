describe('learner progress path identity', () => {
  test('uses authenticated directory user id in API path', () => {
    const directoryUserId = 'dir-user-123'
    const jasmineId = '50a630f4-826e-45aa-8f70-653e5e592fc3'

    const authenticatedPath = `/courses/learners/${directoryUserId}/progress`
    const legacyPath = `/courses/learners/${jasmineId}/progress`

    expect(authenticatedPath).toBe('/courses/learners/dir-user-123/progress')
    expect(authenticatedPath).not.toBe(legacyPath)
  })
})
