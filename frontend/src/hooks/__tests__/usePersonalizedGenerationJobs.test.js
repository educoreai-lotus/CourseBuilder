import { renderHook, act, waitFor } from '@testing-library/react'
import { usePersonalizedGenerationJobs, PERSONALIZED_JOBS_POLL_MS } from '../usePersonalizedGenerationJobs.js'
import { getPersonalizedGenerationJobs } from '../../services/apiService.js'

jest.mock('../../services/apiService.js', () => ({
  getPersonalizedGenerationJobs: jest.fn()
}))

describe('usePersonalizedGenerationJobs', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    getPersonalizedGenerationJobs.mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('loads jobs on mount and exposes active jobs', async () => {
    getPersonalizedGenerationJobs.mockResolvedValue({
      jobs: [{ job_id: 'j1', status: 'pending', competency_target_name: 'Java' }]
    })

    const { result } = renderHook(() => usePersonalizedGenerationJobs())

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.activeJobs).toHaveLength(1)
    expect(getPersonalizedGenerationJobs).toHaveBeenCalledTimes(1)
  })

  test('polls while active and stops when terminal', async () => {
    getPersonalizedGenerationJobs
      .mockResolvedValueOnce({
        jobs: [{ job_id: 'j1', status: 'processing' }]
      })
      .mockResolvedValueOnce({
        jobs: [{ job_id: 'j1', status: 'completed' }]
      })

    const onInactive = jest.fn()
    const { result } = renderHook(() =>
      usePersonalizedGenerationJobs({ onActiveJobsBecameInactive: onInactive })
    )

    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.activeJobs).toHaveLength(1)

    await act(async () => {
      jest.advanceTimersByTime(PERSONALIZED_JOBS_POLL_MS)
      await Promise.resolve()
    })

    expect(result.current.activeJobs).toHaveLength(0)
    expect(onInactive).toHaveBeenCalledTimes(1)

    const callsAfterComplete = getPersonalizedGenerationJobs.mock.calls.length

    await act(async () => {
      jest.advanceTimersByTime(PERSONALIZED_JOBS_POLL_MS * 3)
      await Promise.resolve()
    })

    expect(getPersonalizedGenerationJobs.mock.calls.length).toBe(callsAfterComplete)
  })

  test('prevents overlapping poll requests', async () => {
    let resolveFirst
    getPersonalizedGenerationJobs.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve
        })
    )

    const { result } = renderHook(() => usePersonalizedGenerationJobs())

    expect(getPersonalizedGenerationJobs).toHaveBeenCalledTimes(1)

    await act(async () => {
      result.current.refetchJobs({ silent: true })
      result.current.refetchJobs({ silent: true })
    })

    expect(getPersonalizedGenerationJobs).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveFirst({ jobs: [{ job_id: 'j1', status: 'pending' }] })
      await Promise.resolve()
    })

    expect(result.current.activeJobs).toHaveLength(1)
  })

  test('cleans interval on unmount', async () => {
    getPersonalizedGenerationJobs.mockResolvedValue({
      jobs: [{ job_id: 'j1', status: 'pending' }]
    })

    const { result, unmount } = renderHook(() => usePersonalizedGenerationJobs())
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.activeJobs).toHaveLength(1)

    const callsBefore = getPersonalizedGenerationJobs.mock.calls.length
    unmount()

    await act(async () => {
      jest.advanceTimersByTime(PERSONALIZED_JOBS_POLL_MS * 2)
      await Promise.resolve()
    })

    expect(getPersonalizedGenerationJobs.mock.calls.length).toBe(callsBefore)
  })

  test('keeps last known jobs when readiness API fails', async () => {
    getPersonalizedGenerationJobs
      .mockResolvedValueOnce({
        jobs: [{ job_id: 'j1', status: 'pending' }]
      })
      .mockRejectedValueOnce(new Error('network'))

    const { result } = renderHook(() => usePersonalizedGenerationJobs())
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.activeJobs).toHaveLength(1)

    await act(async () => {
      jest.advanceTimersByTime(PERSONALIZED_JOBS_POLL_MS)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.jobsError).toBeTruthy()
    expect(result.current.activeJobs).toHaveLength(1)
  })

  test('completion callback does not repeat for the same transition signature', async () => {
    const onInactive = jest.fn()
    getPersonalizedGenerationJobs
      .mockResolvedValueOnce({
        jobs: [{ job_id: 'j1', status: 'processing' }]
      })
      .mockResolvedValue({
        jobs: [{ job_id: 'j1', status: 'completed' }]
      })

    const { result } = renderHook(() =>
      usePersonalizedGenerationJobs({ onActiveJobsBecameInactive: onInactive })
    )

    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.activeJobs).toHaveLength(1)

    await act(async () => {
      jest.advanceTimersByTime(PERSONALIZED_JOBS_POLL_MS)
      await Promise.resolve()
    })
    expect(onInactive).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.refetchJobs({ silent: true })
      await result.current.refetchJobs({ silent: true })
    })

    expect(onInactive).toHaveBeenCalledTimes(1)
  })
})
