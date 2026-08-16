import { cn } from '@/lib/utils/cn'

describe('cn', () => {
  it('объединяет строки классов', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('отбрасывает falsy значения', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })

  it('обрабатывает объекты с boolean флагами', () => {
    expect(cn('btn', { 'is-active': true, disabled: false })).toBe('btn is-active')
  })

  it('мержит конфликтующие tailwind-классы (последний побеждает)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('обрабатывает вложенные массивы', () => {
    expect(cn(['a', ['b', 'c']], 'd')).toBe('a b c d')
  })
})