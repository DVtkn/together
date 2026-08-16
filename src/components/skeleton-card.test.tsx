import { render, screen } from '@testing-library/react'
import { SkeletonCard } from '@/components/skeleton-card'

describe('SkeletonCard', () => {
  it('рендерит указанное число карточек-скелетонов', () => {
    render(<SkeletonCard count={4} />)
    const cards = document.querySelectorAll('.sk-card')
    expect(cards).toHaveLength(4)
  })

  it('по умолчанию рендерит 3 скелетона', () => {
    render(<SkeletonCard />)
    expect(document.querySelectorAll('.sk-card')).toHaveLength(3)
  })

  it('имеет роль status и скрытый текст для доступности', () => {
    render(<SkeletonCard count={1} />)
    const region = screen.getByRole('status')
    expect(region).toBeInTheDocument()
    expect(screen.getByText('Загрузка…')).toBeInTheDocument()
  })
})