import type { Metadata } from 'next'
import { LegalPolicyPage } from '@/components/layout/LegalPolicyPage'

export const metadata: Metadata = {
  title: 'Terms & Privacy | PlateIQ',
  description: 'Combined baseline terms, privacy, and third-party handling guidance for PlateIQ.',
}

export default function LegalPage() {
  return <LegalPolicyPage />
}