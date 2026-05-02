import { cva, type VariantProps } from 'class-variance-authority'

export { default as Alert } from './Alert.vue'
export { default as AlertTitle } from './AlertTitle.vue'
export { default as AlertDescription } from './AlertDescription.vue'

export const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[16px_1fr] gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        warning: 'border-warning/50 text-warning [&>svg]:text-warning',
        success: 'border-success/50 text-success [&>svg]:text-success',
        info: 'border-info/50 text-info [&>svg]:text-info',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export type AlertVariants = VariantProps<typeof alertVariants>
