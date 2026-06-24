<script lang="ts" generics="C extends { allowBackFill: boolean; allowFutureFill: boolean; flexible: boolean }">
    import * as Field from '$lib/components/ui/field/index.js';
    import { Checkbox } from '$lib/components/ui/checkbox/index.js';
    import type { FormErrors } from '$lib/types/schemas';

    // Shared fill/scheduling options living on every activity's jsonb `config`.
    // Generic over the concrete config type so two-way binding stays type-safe for
    // Habit / Plant / Workout configs alike. Submitted as JSON (drawer dataType:
    // 'json'), so no hidden inputs are needed.
    let { config = $bindable(), errors }: { config: C; errors?: FormErrors } = $props();

    const options = [
        {
            key: 'allowBackFill',
            label: 'Allow back-fill',
            description: 'Complete a missed day during this week.',
        },
        {
            key: 'allowFutureFill',
            label: 'Allow future-fill',
            description: 'Tick off days ahead - within this week only.',
        },
        {
            key: 'flexible',
            label: 'Flexible',
            description: 'If missed, keep showing every day until completed - then resume the normal schedule.',
        },
    ] as const;
</script>

<Field.Group>
    {#each options as opt (opt.key)}
        <Field.Field>
            <div class="flex items-start gap-3">
                <Checkbox
                    id="config-{opt.key}"
                    checked={config[opt.key]}
                    onCheckedChange={(checked) => {
                        config = { ...config, [opt.key]: checked === true };
                    }}
                />
                <div class="grid gap-0.5">
                    <Field.Label for="config-{opt.key}" class="cursor-pointer">{opt.label}</Field.Label>
                    <p class="text-xs leading-snug text-muted-foreground">{opt.description}</p>
                </div>
            </div>
            <Field.Error errors={errors?.config?.[opt.key]} />
        </Field.Field>
    {/each}
</Field.Group>
