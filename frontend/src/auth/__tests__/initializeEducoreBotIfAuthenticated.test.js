import { initializeEducoreBotIfAuthenticated } from '../initializeEducoreBotIfAuthenticated.js'
import { AUTH_TOKEN_STORAGE_KEY } from '../tokenStorage.js'

const JASMINE_ID = '50a630f4-826e-45aa-8f70-653e5e592fc3'

describe('initializeEducoreBotIfAuthenticated', () => {
  beforeEach(() => {
    localStorage.clear()
    window.initializeEducoreBot = jest.fn()
  })

  afterEach(() => {
    delete window.initializeEducoreBot
  })

  test('skips bot initialization when auth_token is missing', () => {
    localStorage.setItem('token', JASMINE_ID)

    const initialized = initializeEducoreBotIfAuthenticated(JASMINE_ID)

    expect(initialized).toBe(false)
    expect(window.initializeEducoreBot).not.toHaveBeenCalled()
  })

  test('does not pass userProfile.id as token when auth_token is missing', () => {
    initializeEducoreBotIfAuthenticated(JASMINE_ID)

    expect(window.initializeEducoreBot).not.toHaveBeenCalled()
  })

  test('initializes bot with real auth_token when present', () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'dummy.jwt.token')

    const initialized = initializeEducoreBotIfAuthenticated(JASMINE_ID)

    expect(initialized).toBe(true)
    expect(window.initializeEducoreBot).toHaveBeenCalledWith({
      microservice: 'COURSE_BUILDER',
      userId: JASMINE_ID,
      token: 'dummy.jwt.token',
      tenantId: 'default'
    })
  })
})
