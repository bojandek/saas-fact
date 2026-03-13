/**
 * React hook for feature flags
 */

'use client'

import { useState, useEffect } from 'react'
import { featureFlags } from './index'

export function useFeatureFlag(
  featureName: string,
  userId?: string,
  context?: Record<string, any>
) {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null)
  const [variant, setVariant] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      const enabled = await featureFlags.isEnabled(featureName, userId, context)
      setIsEnabled(enabled)

      if (userId && enabled) {
        const v = await featureFlags.getVariant(featureName, userId)
        setVariant(v)
      }
    }

    check()
  }, [featureName, userId, context])

  return { isEnabled, variant, loading: isEnabled === null }
}
