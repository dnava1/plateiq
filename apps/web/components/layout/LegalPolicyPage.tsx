import { TRAINING_ADVISORY_COPY } from '@/components/layout/LegalLinks'
import { LegalBackButton } from '@/components/layout/LegalBackButton'

const sections = [
  {
    title: 'Using PlateIQ',
    paragraphs: [
      'PlateIQ is a training product for planning, logging, and reviewing strength work. Use it responsibly and only in ways that comply with applicable law and the product\'s intended purpose.',
      'You are responsible for the training information you enter and for the decisions you make from it.',
      TRAINING_ADVISORY_COPY,
    ],
  },
  {
    title: 'Accounts, authentication, and third parties',
    paragraphs: [
      'PlateIQ can be used through a guest session or a Google-backed account. Authentication and account recovery rely on third-party providers, including Google and Supabase.',
      'When you sign in or use PlateIQ, those third-party services may process identity, account, and infrastructure data under their own terms, privacy notices, and operational controls.',
    ],
  },
  {
    title: 'What PlateIQ stores',
    paragraphs: [
      'PlateIQ stores the account, workout, program, analytics-preference, and profile data needed to operate the product. That includes the training history and settings you choose to save.',
    ],
  },
  {
    title: 'As-is service and responsibility limits',
    paragraphs: [
      'PlateIQ is provided as-is and as-available, without warranties or guarantees of uninterrupted service, fitness for a specific purpose, or specific training outcomes, to the extent permitted by applicable law.',
      'PlateIQ does not accept responsibility for training decisions, coaching decisions, medical judgment, injuries, or outcomes made from the product\'s information. Use qualified professional advice where it is needed.',
    ],
  },
  {
    title: 'Acceptable use and product changes',
    paragraphs: [
      'Do not use PlateIQ to interfere with the service, abuse other users, or submit unlawful or malicious content.',
      'We may update, improve, or retire product features over time.',
    ],
  },
] as const

export function LegalPolicyPage() {
  return (
    <div className="page-shell max-w-4xl">
      <section className="page-header">
        <div className="flex w-full flex-col gap-3">
          <span className="eyebrow">Legal</span>
          <div className="flex w-full flex-wrap items-center justify-between gap-4">
            <h1 className="page-title">Terms &amp; Privacy</h1>
            <LegalBackButton />
          </div>
        </div>
      </section>

      <div className="surface-panel flex flex-col gap-6 p-6 sm:p-8">
        {sections.map((section) => (
          <section key={section.title} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-[-0.04em] text-foreground">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-6 text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}