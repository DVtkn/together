'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[16px] text-sm font-semibold ring-offset-[#0F172A] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[linear-gradient(135deg,#8B5CF6_0%,#EC4899_100%)] text-white shadow-[0_8px_24px_rgba(139,92,246,0.3)] hover:shadow-[0_12px_32px_rgba(139,92,246,0.4)] active:scale-[0.97]',
        destructive: 'bg-red-600 text-white hover:bg-red-600/90 active:scale-[0.97]',
        outline:
          'border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(139,92,246,0.3)] active:scale-[0.97]',
        secondary:
          'bg-[rgba(255,255,255,0.04)] text-[#F1F5F9] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(139,92,246,0.3)]',
        ghost: 'hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F1F5F9]',
        link: 'text-[#8B5CF6] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-[12px] px-3',
        lg: 'h-11 rounded-[14px] px-8',
        xl: 'h-12 rounded-[16px] px-10',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }