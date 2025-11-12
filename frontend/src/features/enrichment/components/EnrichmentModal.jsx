import { X } from 'lucide-react'

const overlayClasses =
  'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8'
const panelClasses =
  'relative w-full max-w-3xl rounded-3xl border border-[rgba(148,163,184,0.18)] bg-[var(--bg-card)] p-6 shadow-2xl transition-colors'

export default function EnrichmentModal({
  open,
  onClose,
  title = 'AI Enrichment Results',
  items = [],
  error = null
}) {
  if (!open) {
    return null
  }

  return (
    <div className={overlayClasses} role="dialog" aria-modal="true" aria-label={title}>
      <div className={panelClasses}>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full border border-transparent bg-[var(--bg-secondary)] p-2 text-[var(--text-muted)] transition-colors hover:border-[var(--primary-cyan)] hover:text-[var(--text-primary)]"
        >
          <X size={18} />
        </button>

        <header className="mb-6 pr-10">
          <h3 className="text-2xl font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            These assets are suggested by the AI for deeper exploration. Review and attach the ones that best complement
            your lesson.
          </p>
        </header>

        {error ? (
          <div className="rounded-2xl border border-[rgba(248,113,113,0.32)] bg-[rgba(248,113,113,0.08)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
            {error.message || 'Unable to fetch enrichment assets right now. Please try again shortly.'}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[var(--bg-secondary)]/40 px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
            No suggestions yet. Try adjusting the lesson details and enriching again.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item, idx) => (
              <a
                key={`${item.type || 'item'}-${idx}`}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col gap-3 rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[var(--bg-card)]/90 p-4 shadow-sm transition-all hover:border-[var(--primary-cyan)]/70 hover:shadow-lg"
              >
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  {item.type || 'resource'}
                </span>
                <h4 className="text-lg font-semibold leading-snug text-[var(--text-primary)]">{item.title}</h4>
                {item.description && (
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)] line-clamp-4">{item.description}</p>
                )}
                <span className="text-xs font-semibold text-[var(--primary-cyan)] group-hover:text-[var(--primary-cyan-strong)]">
                  View resource →
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

