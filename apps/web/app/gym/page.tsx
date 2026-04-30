import type { Metadata } from 'next'
import { OfflineGymResumePage } from '@/components/workouts/OfflineGymResumePage'

export const metadata: Metadata = {
  title: 'Gym Mode | PlateIQ',
}

export default function GymPage() {
  return <OfflineGymResumePage />
}

