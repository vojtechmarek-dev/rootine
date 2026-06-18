<script lang="ts">
    import type { HeatmapCell } from '$lib/types/stats';

    let { cells }: { cells: HeatmapCell[] } = $props();

    // The window ends today, so open scrolled to the right edge (most recent).
    let scroller = $state<HTMLDivElement>();
    $effect(() => {
        void cells.length; // re-run once cells arrive
        if (scroller) scroller.scrollLeft = scroller.scrollWidth;
    });

    // Sparse weekday labels (GitHub style) — Mon/Wed/Fri.
    const WEEKDAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

    // 0 = Mon … 6 = Sun, for a `yyyy-MM-dd` parsed as UTC midnight.
    function weekdayMon(dateStr: string): number {
        return (new Date(dateStr).getUTCDay() + 6) % 7;
    }

    type Slot = HeatmapCell | null;

    // Pad the front so the first column starts on Monday, then chunk into weeks.
    const columns = $derived.by<Slot[][]>(() => {
        if (cells.length === 0) return [];
        const lead = weekdayMon(cells[0].date);
        const slots: Slot[] = [...Array(lead).fill(null), ...cells];
        const cols: Slot[][] = [];
        for (let i = 0; i < slots.length; i += 7) cols.push(slots.slice(i, i + 7));
        return cols;
    });

    // One label per column, shown only when the month changes.
    const monthLabels = $derived.by<string[]>(() => {
        const labels: string[] = [];
        let prev = '';
        for (const col of columns) {
            const first = col.find((c): c is HeatmapCell => c !== null);
            const month = first ? new Date(first.date).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }) : '';
            labels.push(month && month !== prev ? month : '');
            if (month) prev = month;
        }
        return labels;
    });

    const LEVEL_CLASS = ['bg-surface-container-high', 'bg-primary/30', 'bg-primary/55', 'bg-primary/80', 'bg-primary'];

    function tooltip(cell: HeatmapCell): string {
        const label = cell.count === 0 ? 'No habits' : `${cell.count} habit${cell.count === 1 ? '' : 's'}`;
        return `${label} · ${cell.date}`;
    }
</script>

<div bind:this={scroller} class="overflow-x-auto pb-1">
    <div class="inline-flex flex-col gap-1">
        <!-- Month labels: 16px stride per column (12px cell + 4px gap), offset past the weekday gutter. -->
        <div class="flex pl-9 text-[10px] text-muted-foreground">
            {#each monthLabels as label, i (i)}
                <div class="w-4 shrink-0">{label}</div>
            {/each}
        </div>

        <div class="flex gap-1">
            <!-- Weekday gutter -->
            <div class="flex w-8 shrink-0 flex-col gap-1 text-[10px] text-muted-foreground">
                {#each WEEKDAY_LABELS as label, i (i)}
                    <div class="flex h-3 items-center">{label}</div>
                {/each}
            </div>

            <!-- Week columns -->
            {#each columns as col, ci (ci)}
                <div class="flex flex-col gap-1">
                    {#each col as slot, ri (ri)}
                        {#if slot}
                            <div class="size-3 rounded-[3px] {LEVEL_CLASS[slot.level]}" title={tooltip(slot)}></div>
                        {:else}
                            <div class="size-3"></div>
                        {/if}
                    {/each}
                </div>
            {/each}
        </div>

        <!-- Legend -->
        <div class="flex items-center gap-1 pl-9 text-[10px] text-muted-foreground">
            <span class="mr-0.5">Less</span>
            {#each LEVEL_CLASS as cls, i (i)}
                <div class="size-3 rounded-[3px] {cls}"></div>
            {/each}
            <span class="ml-0.5">More</span>
        </div>
    </div>
</div>
