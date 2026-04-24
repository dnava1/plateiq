import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ConsistencyHeatmap } from './ConsistencyHeatmap'

const sampleData = [
  { isActive: true, totalSessions: 1, totalSets: 5, totalVolume: 1000, weekStart: '2026-03-02' },
  { isActive: true, totalSessions: 1, totalSets: 4, totalVolume: 600, weekStart: '2026-03-09' },
  { isActive: false, totalSessions: 0, totalSets: 0, totalVolume: 0, weekStart: '2026-03-16' },
]

describe('ConsistencyHeatmap', () => {
  it('anchors full-size columns from the top so wrapped labels do not shift bar alignment', () => {
    const { container } = render(<ConsistencyHeatmap data={sampleData} />)
    const heatmap = container.querySelector('div.flex.gap-1\\.5')

    expect(heatmap).toHaveClass('items-start')
    expect(heatmap).not.toHaveClass('items-end')
    expect(screen.getAllByText(/Mar/u)).toHaveLength(3)
  })

  it('keeps compact mode centered and hides date labels', () => {
    const { container } = render(<ConsistencyHeatmap compact data={sampleData} />)
    const heatmap = container.querySelector('div.flex.gap-1\\.5')

    expect(heatmap).toHaveClass('items-center')
    expect(screen.queryByText(/Mar/u)).not.toBeInTheDocument()
  })

  it('shows a hover and focus tooltip with week and volume details', () => {
    render(<ConsistencyHeatmap data={sampleData} />)

    const weekCell = screen.getAllByLabelText(/Week of Mar/i)[0]
    fireEvent.mouseEnter(weekCell)

    expect(screen.getByRole('tooltip')).toHaveTextContent('Week of Mar')
    expect(screen.getByRole('tooltip')).toHaveTextContent('1,000 lbs')
    expect(screen.getByRole('tooltip')).toHaveTextContent('5')
  })
})