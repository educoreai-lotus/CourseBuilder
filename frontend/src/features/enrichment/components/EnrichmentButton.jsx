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
      type = 'lesson',
      title,
      lesson_name,
      name,
      description,
      summary,
      content,
      metadata = {}
    } = asset

    const resolvedTitle = title || lesson_name || name || metadata?.title
    const resolvedDescription =
      description || summary || metadata?.description || metadata?.summary || content

    return {
      type,
      title: resolvedTitle,
      description: resolvedDescription,
      metadata
    }
  }, [asset])

  const handleEnrich = async () => {
    if (!payload) return

    setLoading(true)
    setError(null)

    try {
      const response = await enrichAssets(payload)
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
    } finally {
      setLoading(false)
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

