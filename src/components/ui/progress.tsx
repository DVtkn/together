'use client'

import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]', className)}
      {...props}
    >
      <div
        className="h-full bg-[linear-gradient(135deg,#8B5CF6_0%,#EC4899_100%)] transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, (value / max) * 100))}%` }}
      />
    </div>
  )
)
Progress.displayName = 'Progress'

export { Progress }