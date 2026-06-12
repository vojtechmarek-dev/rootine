<script lang="ts" module>
    import { cn, type WithElementRef } from '$lib/utils.js';
    import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
    import { type VariantProps, tv } from 'tailwind-variants';

    export const buttonVariants = tv({
        base: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        variants: {
            variant: {
                // Hovers mix toward the foreground colour instead of dropping
                // opacity — translucent hovers show content through floating
                // buttons (FAB, overlapping actions).
                default:
                    'bg-primary text-primary-foreground hover:bg-[color-mix(in_oklab,var(--primary)_85%,var(--primary-foreground))] shadow-xs',
                clay: 'bg-clay text-clay-foreground hover:bg-[color-mix(in_oklab,var(--clay)_85%,var(--clay-foreground))] shadow-ambient',
                danger: 'bg-danger text-danger-foreground hover:bg-[color-mix(in_oklab,var(--danger)_85%,var(--danger-foreground))] shadow-xs focus-visible:ring-danger/30',
                destructive:
                    'bg-destructive text-destructive-foreground hover:bg-[color-mix(in_oklab,var(--destructive)_85%,var(--destructive-foreground))] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 shadow-xs',
                outline:
                    'bg-card hover:bg-accent hover:text-accent-foreground dark:bg-surface-container-high/85 dark:border-outline-variant/20 dark:hover:bg-surface-container-high border shadow-xs',
                secondary:
                    'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklab,var(--secondary)_85%,var(--secondary-foreground))] shadow-xs',
                ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-10 px-5 py-2 has-[>svg]:px-4',
                sm: 'h-8 gap-1.5 px-3.5 has-[>svg]:px-3',
                lg: 'h-12 px-7 has-[>svg]:px-5',
                icon: 'size-9',
                'icon-sm': 'size-8',
                'icon-lg': 'size-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    });

    export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
    export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

    export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
        WithElementRef<HTMLAnchorAttributes> & {
            variant?: ButtonVariant;
            size?: ButtonSize;
        };
</script>

<script lang="ts">
    let {
        class: className,
        variant = 'default',
        size = 'default',
        ref = $bindable(null),
        href = undefined,
        type = 'button',
        disabled,
        children,
        ...restProps
    }: ButtonProps = $props();
</script>

{#if href}
    <a
        bind:this={ref}
        data-slot="button"
        class={cn(buttonVariants({ variant, size }), className)}
        href={disabled ? undefined : href}
        aria-disabled={disabled}
        role={disabled ? 'link' : undefined}
        tabindex={disabled ? -1 : undefined}
        {...restProps}
    >
        {@render children?.()}
    </a>
{:else}
    <button bind:this={ref} data-slot="button" class={cn(buttonVariants({ variant, size }), className)} {type} {disabled} {...restProps}>
        {@render children?.()}
    </button>
{/if}
