import {
  Youtube,
  Github,
  ExternalLink,
  PlayCircle,
  Star,
  Clock,
  RefreshCw,
  Tag
} from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const formatISODuration = (iso) => {
  if (!iso || typeof iso !== 'string') return '—'
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i)
  if (!match) return iso
  const [, h, m, s] = match.map((value) => Number(value) || 0)
  const parts = []
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}m`)
  if (s && !h) parts.push(`${s}s`)
  return parts.join(' ') || '—'
}

const formatNumber = (value) => {
  if (value == null) return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return '—'
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

export default function LessonAssetsPanel({ data, loading, error }) {
  if (!loading && !data && !error) {
    return null
  }

  const hasVideos = data?.videos?.length > 0
  const hasRepos = data?.repos?.length > 0
  const hasSuggested = Boolean(
    (data?.suggestedUrls?.youtube && data.suggestedUrls.youtube.length > 0) ||
      (data?.suggestedUrls?.github && data.suggestedUrls.github.length > 0)
  )
  const hasTags = Array.isArray(data?.tags) && data.tags.length > 0

  return (
    <section className="rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)]/90 p-6 shadow-lg backdrop-blur transition-colors">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            AI-curated practice assets
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Videos and repositories selected for this lesson to help you deepen mastery with hands-on exploration.
          </p>
        </div>
        {data?.generatedAt && (
          <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(14,165,233,0.12)] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#0f766e]">
            <RefreshCw size={14} />
            Updated {dayjs(data.generatedAt).fromNow()}
          </span>
        )}
      </header>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, idx) => (
            <div
              key={idx}
              className="animate-pulse rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[var(--bg-secondary)]/50 p-4"
            >
              <div className="h-4 w-1/2 rounded bg-[rgba(148,163,184,0.24)]" />
              <div className="mt-3 h-3 w-3/4 rounded bg-[rgba(148,163,184,0.18)]" />
              <div className="mt-2 h-3 w-2/3 rounded bg-[rgba(148,163,184,0.14)]" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-[rgba(248,113,113,0.32)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          Unable to load enriched assets right now. Please try again later.
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-6">
          {hasTags && (
            <div className="flex flex-wrap items-center gap-2">
              {data.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-2 rounded-full bg-[rgba(124,58,237,0.16)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#5b21b6]"
                >
                  <Tag size={14} />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {hasSuggested && (
            <div className="grid gap-4 md:grid-cols-2">
              {data?.suggestedUrls?.youtube?.length > 0 && (
                <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[var(--bg-card)]/80 p-4 shadow-sm transition-colors">
                  <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#dc2626]">
                    <Youtube size={16} />
                    Quick-start playlists
                  </div>
                  <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {data.suggestedUrls.youtube.map((url) => (
                      <li key={url}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[var(--primary-cyan)] hover:text-[var(--primary-cyan-strong)]"
                        >
                          <ExternalLink size={14} />
                          {url.replace(/^https?:\/\//, '')}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data?.suggestedUrls?.github?.length > 0 && (
                <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[var(--bg-card)]/80 p-4 shadow-sm transition-colors">
                  <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#111827] dark:text-white">
                    <Github size={16} />
                    Must-read repos
                  </div>
                  <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {data.suggestedUrls.github.map((url) => (
                      <li key={url}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[var(--primary-cyan)] hover:text-[var(--primary-cyan-strong)]"
                        >
                          <ExternalLink size={14} />
                          {url.replace(/^https?:\/\//, '')}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {hasVideos && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Youtube size={18} className="text-[#dc2626]" />
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Focused YouTube sessions
                </h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.videos.map((video) => (
                  <a
                    key={video.id}
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex flex-col gap-3 rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[var(--bg-card)]/90 p-4 shadow-sm transition-all hover:border-[var(--primary-cyan)]/60 hover:shadow-lg"
                  >
                    <span className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-[rgba(14,165,233,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#0f766e] transition-colors group-hover:bg-[var(--gradient-primary)] group-hover:text-white">
                      <PlayCircle size={14} />
                      Watch
                    </span>
                    <div className="max-w-[80%] text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {video.channelTitle}
                    </div>
                    <h4 className="text-lg font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                      {video.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} />
                        {formatISODuration(video.durationISO)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <PlayCircle size={12} />
                        {formatNumber(video.viewCount)} views
                      </span>
                      {video.publishedAt && (
                        <span className="inline-flex items-center gap-1">
                          <RefreshCw size={12} />
                          {dayjs(video.publishedAt).fromNow()}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {hasRepos && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Github size={18} className="text-[#111827] dark:text-white" />
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  GitHub practice repositories
                </h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.repos.map((repo) => (
                  <a
                    key={repo.id}
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col gap-3 rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[var(--bg-card)]/90 p-4 shadow-sm transition-all hover:border-[var(--primary-cyan)]/60 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-lg font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                        {repo.name}
                      </h4>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(250,204,21,0.12)] px-3 py-1 text-xs font-semibold text-[#b45309]">
                        <Star size={14} />
                        {formatNumber(repo.stars)}
                      </span>
                    </div>
                    {repo.description && (
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {repo.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      {repo.language && <span>{repo.language}</span>}
                      {repo.topics &&
                        repo.topics.slice(0, 3).map((topic) => (
                          <span key={topic} className="rounded-full bg-[rgba(14,165,233,0.12)] px-2 py-1 lowercase text-[#0f766e]">
                            {topic}
                          </span>
                        ))}
                      {repo.lastCommit && (
                        <span className="inline-flex items-center gap-1">
                          <RefreshCw size={12} />
                          Updated {dayjs(repo.lastCommit).fromNow()}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {!hasVideos && !hasRepos && !hasSuggested && (
            <div className="rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[var(--bg-secondary)]/50 px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
              No curated assets yet—complete more lessons to unlock personalized resources.
            </div>
          )}
        </div>
      )}
    </section>
  )
}

