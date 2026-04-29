import type { User } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { resolveUserDisplayProfile } from './user-display'

function createUser(overrides: Record<string, unknown>): User {
  return {
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-04-28T00:00:00.000Z',
    id: 'user-1',
    is_anonymous: false,
    user_metadata: {},
    ...overrides,
  } as User
}

describe('resolveUserDisplayProfile', () => {
  it('uses Google identity metadata when top-level user metadata is empty', () => {
    const user = createUser({
      email: 'friend@example.com',
      identities: [
        {
          identity_data: {
            name: 'Friend Lifter',
            picture: 'https://lh3.googleusercontent.com/avatar',
          },
          provider: 'google',
        },
      ],
    })

    expect(resolveUserDisplayProfile(user)).toMatchObject({
      avatarUrl: 'https://lh3.googleusercontent.com/avatar',
      displayName: 'Friend Lifter',
      initials: 'FL',
    })
  })

  it('keeps top-level metadata first when it exists', () => {
    const user = createUser({
      email: 'friend@example.com',
      user_metadata: {
        avatar_url: 'https://example.com/custom-avatar.png',
        full_name: 'Custom Name',
      },
      identities: [
        {
          identity_data: {
            name: 'Google Name',
            picture: 'https://lh3.googleusercontent.com/google-avatar',
          },
          provider: 'google',
        },
      ],
    })

    expect(resolveUserDisplayProfile(user)).toMatchObject({
      avatarUrl: 'https://example.com/custom-avatar.png',
      displayName: 'Custom Name',
      initials: 'CN',
    })
  })

  it('uses the requested anonymous account label', () => {
    const user = createUser({
      email: null,
      is_anonymous: true,
    })

    expect(resolveUserDisplayProfile(user, { anonymousDisplayName: 'Guest account' })).toMatchObject({
      avatarUrl: null,
      displayName: 'Guest account',
      initials: 'GA',
    })
  })
})
