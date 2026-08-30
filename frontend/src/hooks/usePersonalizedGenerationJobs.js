import { useCallback, useEffect, useRef, useState } from 'react'
import { getPersonalizedGenerationJobs } from '../services/apiService.js'
import {
  getActiveJobs,
  hadActiveJobsBecomeInactive,
  normalizeJobsResponse
} from '../utils/personalizedGenerationJobs.js'

export const PERSONALIZED_JOBS_POLL_MS = 8000

function completionTransitionSignature(prevJobs, nextJobs) {
  const nextActiveIds = new Set(
    getActiveJobs(nextJobs).map((j) => String(j.job_id || j.id || ''))
  )
  return getActiveJobs(prevJobs)
    .filter((j) => !nextActiveIds.has(String(j.job_id || j.id || '')))
    .map((j) => String(j.job_id || j.id || ''))
    .sort()
    .join(',')
}

/**
 * Fetch + poll personalized generation jobs.
 * Polls only while active (pending/processing) jobs exist.
 * Overlapping polls are skipped via an in-flight guard.
 */
export function usePersonalizedGenerationJobs({
  enabled = true,
  identityKey = null,
  onActiveJobsBecameInactive = null,
  pollIntervalMs = PERSONALIZED_JOBS_POLL_MS
} = {}) {
  const [jobs, setJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(Boolean(enabled))
  const [jobsError, setJobsError] = useState(null)

  const mountedRef = useRef(true)
  const inFlightRef = useRef(false)
  const jobsRef = useRef([])
  const softErrorShownRef = useRef(false)
  const lastCompletionSigRef = useRef(null)
  const onInactiveRef = useRef(onActiveJobsBecameInactive)

  useEffect(() => {
    onInactiveRef.current = onActiveJobsBecameInactive
  }, [onActiveJobsBecameInactive])

  const applyJobs = useCallback((nextJobs) => {
    const prev = jobsRef.current
    jobsRef.current = nextJobs
    setJobs(nextJobs)

    if (
      typeof onInactiveRef.current === 'function' &&
      hadActiveJobsBecomeInactive(prev, nextJobs)
    ) {
      const sig = completionTransitionSignature(prev, nextJobs)
      if (sig && sig !== lastCompletionSigRef.current) {
        lastCompletionSigRef.current = sig
        onInactiveRef.current()
      }
    }

    if (getActiveJobs(nextJobs).length > 0) {
      // Allow a later completion wave to refresh courses again.
      lastCompletionSigRef.current = null
    }
  }, [])

  const fetchJobs = useCallback(
    async ({ silent = false } = {}) => {
      if (!enabled) {
        return []
      }
      if (inFlightRef.current) {
        return jobsRef.current
      }

      inFlightRef.current = true
      try {
        const data = await getPersonalizedGenerationJobs()
        if (!mountedRef.current) return jobsRef.current
        const nextJobs = normalizeJobsResponse(data)
        applyJobs(nextJobs)
        setJobsError(null)
        softErrorShownRef.current = false
        return nextJobs
      } catch (error) {
        if (!mountedRef.current) return jobsRef.current
        setJobsError(error)
        return jobsRef.current
      } finally {
        inFlightRef.current = false
        if (mountedRef.current && !silent) {
          setJobsLoading(false)
        }
      }
    },
    [applyJobs, enabled]
  )

  useEffect(() => {
    mountedRef.current = true
    if (!enabled) {
      setJobsLoading(false)
      return undefined
    }

    jobsRef.current = []
    setJobs([])
    setJobsLoading(true)
    fetchJobs({ silent: false })

    return () => {
      mountedRef.current = false
    }
  }, [enabled, fetchJobs, identityKey])

  useEffect(() => {
    if (!enabled) return undefined

    const active = getActiveJobs(jobs)
    if (active.length === 0) return undefined

    const timerId = setInterval(() => {
      fetchJobs({ silent: true })
    }, pollIntervalMs)

    return () => {
      clearInterval(timerId)
    }
  }, [enabled, jobs, fetchJobs, pollIntervalMs])

  return {
    jobs,
    activeJobs: getActiveJobs(jobs),
    jobsLoading,
    jobsError,
    softErrorShownRef,
    inFlightRef,
    refetchJobs: fetchJobs
  }
}

export default usePersonalizedGenerationJobs
