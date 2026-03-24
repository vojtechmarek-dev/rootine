<script lang="ts">
    import { buttonVariants } from '$lib/components/ui/button/index.js';
    import { cn } from '$lib/utils.js';
    import { Calendar as CalendarPrimitive } from 'bits-ui';

    let { ref = $bindable(null), class: className, ...restProps }: CalendarPrimitive.DayProps = $props();
</script>

<CalendarPrimitive.Day
    bind:ref
    class={cn(
        buttonVariants({ variant: 'ghost' }),
        'flex size-(--cell-size) flex-col items-center justify-center gap-1 p-0 leading-none font-normal whitespace-nowrap select-none',
        'data-today:ring-1 data-today:ring-primary/45 data-today:ring-inset [&[data-today]:not([data-selected])]:bg-accent/60 [&[data-today]:not([data-selected])]:text-accent-foreground [&[data-today][data-disabled]]:text-muted-foreground',
        'data-selected:bg-primary data-selected:text-primary-foreground data-selected:hover:bg-primary/90 dark:data-selected:hover:bg-primary/85',
        // Outside months
        '[&[data-outside-month]:not([data-selected])]:text-muted-foreground [&[data-outside-month]:not([data-selected])]:hover:text-accent-foreground',
        // Disabled
        'data-disabled:pointer-events-none data-disabled:text-muted-foreground data-disabled:opacity-50',
        // Unavailable
        'data-unavailable:text-muted-foreground data-unavailable:line-through',
        // hover
        'hover:bg-accent/70 hover:text-accent-foreground dark:hover:bg-accent/45',
        // focus
        'focus:relative focus:border-ring focus:ring-ring/50',
        // inner spans
        '[&>span]:text-xs [&>span]:opacity-70',
        className
    )}
    {...restProps}
/>
