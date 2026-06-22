import { useEffect, useState } from 'react'

export function useBlobUrl(blob: Blob): string {
  const [url] = useState(() => URL.createObjectURL(blob))

  useEffect(() => {
    return () => URL.revokeObjectURL(url)
  }, [url])

  return url
}
