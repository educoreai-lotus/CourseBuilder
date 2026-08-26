import { api, getPersonalizedGenerationJobs } from '../apiService.js'

describe('getPersonalizedGenerationJobs', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('uses existing API client and personalized-generation jobs path', async () => {
    const getSpy = jest.spyOn(api, 'get').mockResolvedValue({
      data: { jobs: [{ job_id: 'j1', status: 'pending' }] }
    })

    const result = await getPersonalizedGenerationJobs()

    expect(getSpy).toHaveBeenCalledTimes(1)
    expect(getSpy).toHaveBeenCalledWith('/personalized-generation/jobs')
    expect(result).toEqual({ jobs: [{ job_id: 'j1', status: 'pending' }] })
  })

  test('does not include manual learner or user id in the request', async () => {
    const getSpy = jest.spyOn(api, 'get').mockResolvedValue({ data: { jobs: [] } })

    await getPersonalizedGenerationJobs()

    const [path, config] = getSpy.mock.calls[0]
    expect(path).toBe('/personalized-generation/jobs')
    expect(config).toBeUndefined()

    const serialized = JSON.stringify(getSpy.mock.calls[0])
    expect(serialized).not.toMatch(/userId|directoryUserId|learner_user_id|learnerId/i)
  })
})
