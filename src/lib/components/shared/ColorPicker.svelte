<script lang="ts">
    import ColorPicker from 'svelte-awesome-color-picker';
    import { ACTIVITY_COLOR_PALETTE, ACTIVITY_COLOR_SWATCHES, isHexColor } from '$lib/utils';

    let {
        value = $bindable(),
        label = 'Color',
    }: {
        value: string | null | undefined;
        label?: string;
    } = $props();

    // Stored value may be a legacy token ("forest") or a hex; the picker speaks hex.
    const toHex = (v: string | null | undefined) =>
        isHexColor(v) ? v : (ACTIVITY_COLOR_PALETTE[(v ?? '').trim().toLowerCase()] ?? ACTIVITY_COLOR_PALETTE.forest);

    let hex = $state(toHex(value));

    // One-way: picker drives the stored value. Initial value seeds `hex` above.
    $effect(() => {
        if (hex && hex !== value) {
            value = hex;
        }
    });
</script>

<div
    class="color-picker-field flex h-12 w-full items-center gap-3 rounded-sm border border-border/60 bg-input px-4 text-sm focus-within:border-ring focus-within:ring-2 focus-within:ring-tertiary-fixed"
>
    <ColorPicker bind:hex {label} isAlpha={false} position="responsive" isTextInput={false} swatches={ACTIVITY_COLOR_SWATCHES} />
    <span class="ml-auto text-sm text-muted-foreground">{hex}</span>
</div>

<style>
    /* Strip the library's own input chrome so it sits flush inside our field. */
    .color-picker-field {
        --input-size: 1.25rem;
    }
    .color-picker-field :global(.color-picker label) {
        margin: 0;
        background: transparent;
        border: none;
        padding: 0;
    }
</style>
