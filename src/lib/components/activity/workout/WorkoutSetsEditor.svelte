<script lang="ts">
    import * as Field from '$lib/components/ui/field/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Checkbox } from '$lib/components/ui/checkbox/index.js';
    import { Plus, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Pencil, RotateCcw } from '@lucide/svelte';
    import type { WorkoutSet, FormErrors } from '$lib/types/schemas';
    import ExerciseListEditor from './ExerciseListEditor.svelte';

    let {
        workoutSets = $bindable(),
        rotation = $bindable(),
        useRotation = $bindable(),
        errors,
    }: {
        workoutSets: WorkoutSet[];
        rotation: string[];
        useRotation: boolean;
        errors?: FormErrors;
    } = $props();

    let editingSetId = $state<string | null>(null);

    // Keep rotation in lockstep with the sets: preserve existing order, append
    // newly added set ids (defaults to the order sets were added), drop deleted
    // ones. Runs after any set add/remove.
    $effect(() => {
        const ids = workoutSets.map((s) => s.id);
        const idSet = new Set(ids);
        const kept = rotation.filter((id) => idSet.has(id));
        const appended = ids.filter((id) => !kept.includes(id));
        const next = [...kept, ...appended];
        if (next.length !== rotation.length || next.some((id, i) => id !== rotation[i])) {
            rotation = next;
        }
    });

    function addSet() {
        const id = crypto.randomUUID();
        workoutSets = [...workoutSets, { id, name: '', exercises: [] }];
        editingSetId = id;
    }

    function deleteSet(id: string) {
        workoutSets = workoutSets.filter((s) => s.id !== id);
        if (editingSetId === id) {
            editingSetId = null;
        }
    }

    function moveSet(index: number, delta: number) {
        const target = index + delta;
        if (target < 0 || target >= workoutSets.length) {
            return;
        }
        const next = [...workoutSets];
        [next[index], next[target]] = [next[target], next[index]];
        workoutSets = next;
    }

    function moveChip(index: number, delta: number) {
        const target = index + delta;
        if (target < 0 || target >= rotation.length) {
            return;
        }
        const next = [...rotation];
        [next[index], next[target]] = [next[target], next[index]];
        rotation = next;
    }

    const setName = (id: string) => workoutSets.find((s) => s.id === id)?.name?.trim() || 'Unnamed set';
</script>

<Field.Group>
    <!-- ===================== Workout sets ===================== -->
    <Field.Field>
        <Field.Label>Workout sets</Field.Label>
        <Field.Description>Group exercises into named sets the habit cycles through (e.g. Push Day, Pull Day).</Field.Description>

        <div class="flex flex-col gap-3">
            {#each workoutSets as set, i (set.id)}
                <div class="rounded-lg bg-surface-container-low p-3 shadow-ambient">
                    <div class="flex items-center gap-2">
                        <div class="flex flex-col">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                class="h-6 w-6"
                                disabled={i === 0}
                                onclick={() => moveSet(i, -1)}
                            >
                                <ChevronUp class="h-4 w-4" />
                                <span class="sr-only">Move set up</span>
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                class="h-6 w-6"
                                disabled={i === workoutSets.length - 1}
                                onclick={() => moveSet(i, 1)}
                            >
                                <ChevronDown class="h-4 w-4" />
                                <span class="sr-only">Move set down</span>
                            </Button>
                        </div>

                        <div class="flex-1">
                            <Input
                                type="text"
                                placeholder="Set name (e.g. Push Day)"
                                bind:value={
                                    () => set.name,
                                    (v) => {
                                        // Reassign the array so the rename propagates through the
                                        // $bindable chain — an in-place `set.name = v` goes unobserved
                                        // (superforms data isn't a deep $state proxy).
                                        workoutSets = workoutSets.map((s) => (s.id === set.id ? { ...s, name: v } : s));
                                    }
                                }
                                class="bg-surface-container-high font-medium"
                            />
                            <Field.Error errors={errors?.[i]?.name} />
                        </div>

                        <span class="shrink-0 text-xs text-muted-foreground">
                            {set.exercises.length}
                            {set.exercises.length === 1 ? 'exercise' : 'exercises'}
                        </span>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            class="shrink-0"
                            onclick={() => (editingSetId = editingSetId === set.id ? null : set.id)}
                        >
                            <Pencil class="h-4 w-4" />
                            <span class="sr-only">Edit exercises</span>
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            class="shrink-0 text-danger hover:bg-danger/10 hover:text-danger"
                            onclick={() => deleteSet(set.id)}
                        >
                            <Trash2 class="h-4 w-4" />
                            <span class="sr-only">Delete set</span>
                        </Button>
                    </div>

                    {#if editingSetId === set.id}
                        <div class="mt-3 border-t pt-3">
                            <ExerciseListEditor
                                bind:exercises={
                                    () => set.exercises,
                                    (value) => {
                                        // Rebuild with fresh identities so the change
                                        // propagates through the $bindable chain (superforms
                                        // data isn't a deep $state proxy, so an in-place
                                        // `set.exercises = …` write goes unobserved).
                                        workoutSets = workoutSets.map((s) => (s.id === set.id ? { ...s, exercises: value } : s));
                                    }
                                }
                                errors={errors?.[i]?.exercises}
                            />
                        </div>
                    {/if}
                </div>
            {/each}

            <Button
                type="button"
                variant="ghost"
                class="w-full rounded-xl bg-surface-container-high/60 hover:bg-primary/10 dark:hover:bg-primary/15"
                onclick={addSet}
            >
                <Plus class="mr-2 h-4 w-4" />
                Add set
            </Button>
            <Field.Error errors={errors?._errors} />
        </div>
    </Field.Field>

    <!-- ===================== Rotation ===================== -->
    {#if workoutSets.length >= 2}
        <Field.Field>
            <Field.Label>Rotation</Field.Label>
            <Field.Description>The cycle followed when starting a workout. It loops back to the first set.</Field.Description>

            <label class="flex items-center gap-2 py-1 text-sm">
                <Checkbox bind:checked={useRotation} />
                Use rotation
            </label>

            {#if useRotation}
                <div class="flex flex-wrap items-center gap-2 pt-2">
                    {#each rotation as id, i (id)}
                        <div class="flex items-center gap-1">
                            <div
                                class="flex items-center gap-1 rounded-full bg-surface-container-high px-3 py-1.5 text-sm font-medium text-foreground shadow-ambient"
                            >
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    class="-ml-1 h-5 w-5"
                                    disabled={i === 0}
                                    onclick={() => moveChip(i, -1)}
                                >
                                    <ChevronLeft class="h-3 w-3" />
                                    <span class="sr-only">Move earlier</span>
                                </Button>
                                <span>{setName(id)}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    class="-mr-1 h-5 w-5"
                                    disabled={i === rotation.length - 1}
                                    onclick={() => moveChip(i, 1)}
                                >
                                    <ChevronRight class="h-3 w-3" />
                                    <span class="sr-only">Move later</span>
                                </Button>
                            </div>
                            {#if i < rotation.length - 1}
                                <span class="text-muted-foreground">→</span>
                            {/if}
                        </div>
                    {/each}
                    <span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <RotateCcw class="h-3 w-3" /> loops
                    </span>
                </div>
            {:else}
                <p class="pt-1 text-xs text-muted-foreground">No set is recommended at workout start — you pick manually each time.</p>
            {/if}
        </Field.Field>
    {/if}
</Field.Group>
