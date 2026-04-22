import * as React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AuthLayout from './layout'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe('AuthLayout', () => {
  it('renders the shared legal link footer', () => {
    render(
      <AuthLayout>
        <div>Auth content</div>
      </AuthLayout>,
    )

    expect(screen.getByText('Auth content')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Terms & Privacy' })).toHaveAttribute('href', '/legal')
  })
})