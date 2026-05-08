'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'

type AvatarImageStatus = 'idle' | 'loading' | 'loaded' | 'error'

interface ProfileAvatarProps {
  avatarUrl: string | null
  className?: string
  displayName: string
  initials: string
  size?: 'default' | 'sm' | 'lg'
}

export function ProfileAvatar({
  avatarUrl,
  className,
  displayName,
  initials,
  size = 'default',
}: ProfileAvatarProps) {
  const [imageState, setImageState] = useState<{ src: string | null; status: AvatarImageStatus }>(() => ({
    src: avatarUrl,
    status: avatarUrl ? 'loading' : 'error',
  }))
  const imageStatus = imageState.src === avatarUrl
    ? imageState.status
    : avatarUrl
      ? 'loading'
      : 'error'
  const isWaitingForImage = Boolean(avatarUrl) && imageStatus !== 'loaded' && imageStatus !== 'error'

  return (
    <Avatar size={size} className={className}>
      {avatarUrl ? (
        <AvatarImage
          src={avatarUrl}
          alt={displayName}
          onLoadingStatusChange={(status) => setImageState({ src: avatarUrl, status })}
        />
      ) : null}
      {isWaitingForImage ? (
        <Skeleton className="absolute inset-0 size-full rounded-full" aria-hidden="true" />
      ) : null}
      {!avatarUrl || imageStatus === 'error' ? (
        <AvatarFallback>{initials}</AvatarFallback>
      ) : null}
    </Avatar>
  )
}
