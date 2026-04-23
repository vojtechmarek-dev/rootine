import { tv } from 'tailwind-variants';
import { cn } from '$lib/utils';

export const buttonVariants = tv({
    base: 'cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary-fixed disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    variants: {
        variant: {
            default: 'bg-gradient-to-b from-primary to-primary-container text-primary-foreground shadow-ambient hover:opacity-90',
            clay: 'bg-clay text-clay-foreground shadow-ambient hover:opacity-90',
            destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            outline: 'bg-surface-container-lowest text-foreground shadow-ambient hover:bg-surface-container-low',
            secondary: 'bg-surface-container-low text-foreground hover:bg-surface-container-high',
            ghost: 'hover:bg-surface-container-low text-foreground hover:text-foreground',
            link: 'text-primary underline-offset-4 hover:underline',
        },
        size: {
            default: 'h-10 px-4 py-2',
            sm: 'h-9 px-3',
            lg: 'h-12 px-8',
            icon: 'h-10 w-10',
        },
    },
    defaultVariants: {
        variant: 'default',
        size: 'default',
    },
});

export function getButtonClasses(props: Parameters<typeof buttonVariants>[0]) {
    return cn(buttonVariants(props));
}
