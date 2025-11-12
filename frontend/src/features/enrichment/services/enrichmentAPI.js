const resolveEndpoint = () => {
  const defaultPath = '/api/enrichment/assets'
  const raw = import.meta.env.VITE_API_URL

  if (!raw) {
    return defaultPath
  }

  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const url = new URL(raw, base)
    const pathname = url.pathname.replace(/\/$/, '')
    const apiRoot = pathname.endsWith('/api/v1') ? pathname.slice(0, -'/api/v1'.length) : pathname
    const nextPath = `${apiRoot}/api/enrichment/assets`.replace(/\/{2,}/g, '/')
    url.pathname = nextPath.startsWith('/') ? nextPath : `/${nextPath}`
    return url.toString()
  } catch (error) {
    console.warn('Failed to resolve enrichment endpoint from VITE_API_URL, falling back to relative path.', error)
    return defaultPath
  }
}

const ENRICHMENT_ENDPOINT = resolveEndpoint()

export const enrichAssets = async (assetData = {}) => {
  const response = await fetch(ENRICHMENT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(assetData)
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || 'Failed to enrich asset')
  }

  return response.json()
}

export default {
  enrichAssets
}

