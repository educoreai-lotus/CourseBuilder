import { getNauthFrontendUrl } from '../config/env.js'

export default function SignInRequired() {
  const loginUrl = getNauthFrontendUrl()

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-md w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-8 shadow-sm text-center">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50 mb-3">
          Sign in required
        </h1>
        <p className="text-neutral-600 dark:text-neutral-300 mb-6">
          Please sign in through Directory to access Course Builder.
        </p>
        {loginUrl ? (
          <a
            href={`${loginUrl.replace(/\/+$/, '')}/login`}
            className="inline-flex items-center justify-center rounded-lg bg-[var(--primary-cyan)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Go to sign in
          </a>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Contact your administrator for access.
          </p>
        )}
      </div>
    </div>
  )
}
