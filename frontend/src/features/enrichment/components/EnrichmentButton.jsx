import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { enrichAssets } from '../services/enrichmentAPI.js'
import EnrichmentModal from './EnrichmentModal.jsx'

const mapEnrichedItems = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return []
  }

  const fromVideos = (payload.videos || []).map((video) => ({
    type: 'video',
    title: video.title || video.channelTitle || 'Suggested video',
    url: video.url,
    description: video.description,
    raw: video
  }))

  const fromRepos = (payload.repos || []).map((repo) => ({
    type: 'repo',
    title: repo.name || 'Recommended repository',
    url: repo.url,
    description: repo.description,
    raw: repo
  }))

  const fromSuggestions = [
    ...(payload.suggestedUrls?.youtube || []).map((url) => ({
      type: 'playlist',
      title: 'YouTube playlist',
      url
    })),
    ...(payload.suggestedUrls?.github || []).map((url) => ({
      type: 'reference',
      title: 'GitHub reference',
      url
    }))
  ]

  const fromGeneric = (payload.enrichedItems || []).map((item) => ({
    type: item.type || 'resource',
    title: item.title || 'Suggested resource',
    url: item.url,
    description: item.description
  }))

  const combined = [...fromVideos, ...fromRepos, ...fromSuggestions, ...fromGeneric]
  return combined.filter((item) => item.url && item.title)
}

export default function EnrichmentButton({
  asset,
  onResults,
  onLoading,
  onError,
  buttonLabel = 'AI Enrich',
  disabled,
  className = ''
}) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState(null)

  const isDisabled = disabled || loading || !asset

  const payload = useMemo(() => {
    if (!asset) return null

    const {
      title,
      lesson_name,
      name,
      metadata = {}
    } = asset

    // Backend expects: { topic: string, skills: array, maxItems: number }
    const resolvedTopic = title || lesson_name || name || metadata?.title || metadata?.course_title || 'Learning resources'
    
    // Extract skills from various possible locations
    const skills = [
      ...(Array.isArray(metadata?.skills) ? metadata.skills : []),
      ...(Array.isArray(metadata?.lesson_skills) ? metadata.lesson_skills : []),
      ...(Array.isArray(metadata?.tags) ? metadata.tags : [])
    ].filter(Boolean).slice(0, 8) // Limit to 8 skills

    return {
      topic: resolvedTopic,
      skills,
      maxItems: 6,
      course_id: metadata?.course_id || null // Pass course_id to save assets to course
    }
  }, [asset])

  const handleEnrich = async () => {
    if (!payload) return

    setLoading(true)
    setError(null)
    if (typeof onLoading === 'function') {
      onLoading(true)
    }
    if (typeof onError === 'function') {
      onError(null)
    }

    try {
      console.log('[EnrichmentButton] Sending enrichment request:', { 
        topic: payload.topic, 
        course_id: payload.course_id || 'none',
        skillsCount: payload.skills?.length || 0
      })
      const response = await enrichAssets(payload)
      console.log('[EnrichmentButton] Enrichment response:', {
        savedToCourse: response._savedToCourse,
        saveError: response._saveError,
        videosCount: response?.videos?.length || 0,
        reposCount: response?.repos?.length || 0
      })
      const mappedItems = mapEnrichedItems(response)

      setResults(mappedItems)
      setShowModal(true)
      if (typeof onResults === 'function') {
        onResults(response)
      }
    } catch (err) {
      setError(err)
      setResults([])
      setShowModal(true)
      if (typeof onError === 'function') {
        onError(err)
      }
    } finally {
      setLoading(false)
      if (typeof onLoading === 'function') {
        onLoading(false)
      }
    }
  }

  const buttonClasses =
    'inline-flex items-center gap-2 rounded-full border border-[var(--primary-cyan)] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-semibold text-[var(--primary-cyan)] transition-colors hover:bg-[var(--primary-cyan)] hover:text-white disabled:cursor-not-allowed disabled:border-[rgba(148,163,184,0.24)] disabled:text-[rgba(148,163,184,0.7)] disabled:hover:bg-[var(--bg-secondary)]'

  return (
    <>
      <button
        type="button"
        onClick={handleEnrich}
        disabled={isDisabled}
        className={`${buttonClasses} ${className}`}
      >
        <Sparkles size={16} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Enriching...' : buttonLabel}
      </button>
      <EnrichmentModal
        open={showModal}
        onClose={() => setShowModal(false)}
        items={results}
        title={error ? 'Unable to fetch enrichment' : undefined}
        error={error}
      />
    </>
  )
}

