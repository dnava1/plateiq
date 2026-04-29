import type { User } from '@supabase/supabase-js'
import { isAnonymousUser } from './auth-state'

type MetadataRecord = Record<string, unknown>

type UserIdentity = NonNullable<User['identities']>[number]

const DISPLAY_NAME_KEYS = ['full_name', 'name', 'display_name', 'user_name', 'preferred_username']
const AVATAR_URL_KEYS = ['avatar_url', 'picture']

function isRecord(value: unknown): value is MetadataRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(record: MetadataRecord | null, key: string) {
  const value = record?.[key]

  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function getUserMetadata(user: User) {
  return isRecord(user.user_metadata) ? user.user_metadata : null
}

function getIdentityData(identity: UserIdentity) {
  return isRecord(identity.identity_data) ? identity.identity_data : null
}

function getIdentityPriority(identity: UserIdentity) {
  return identity.provider === 'google' ? 0 : 1
}

function getMetadataCandidates(user: User) {
  const identityMetadata = [...(user.identities ?? [])]
    .sort((left, right) => getIdentityPriority(left) - getIdentityPriority(right))
    .map(getIdentityData)
    .filter((metadata): metadata is MetadataRecord => metadata !== null)

  return [
    getUserMetadata(user),
    ...identityMetadata,
  ].filter((metadata): metadata is MetadataRecord => metadata !== null)
}

function readFirstMetadataString(candidates: MetadataRecord[], keys: string[]) {
  for (const candidate of candidates) {
    for (const key of keys) {
      const value = readString(candidate, key)

      if (value) {
        return value
      }
    }
  }

  return null
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'PI'
}

export function resolveUserDisplayProfile(
  user: User | null | undefined,
  options: {
    anonymousDisplayName?: string
    fallbackDisplayName?: string
  } = {},
) {
  const fallbackDisplayName = options.fallbackDisplayName ?? 'Athlete'
  const displayName = isAnonymousUser(user)
    ? options.anonymousDisplayName ?? 'Guest'
    : user
      ? readFirstMetadataString(getMetadataCandidates(user), DISPLAY_NAME_KEYS) ?? user.email ?? fallbackDisplayName
      : fallbackDisplayName
  const avatarUrl = user && !isAnonymousUser(user)
    ? readFirstMetadataString(getMetadataCandidates(user), AVATAR_URL_KEYS)
    : null

  return {
    avatarUrl,
    displayName,
    initials: getInitials(displayName),
  }
}
