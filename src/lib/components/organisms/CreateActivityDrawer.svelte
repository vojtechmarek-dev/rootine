<script lang="ts">
    import * as Drawer from '$lib/components/ui/drawer';
    import { Button, buttonVariants } from '$lib/components/ui/button';
    import { Plus, Check, Flower2, Dumbbell } from '@lucide/svelte';
    import { cn } from '$lib/utils';
</script>

<Drawer.Root>
    <Drawer.Trigger
        class={cn(
            buttonVariants({ variant: 'default', size: 'icon' }),
            'fixed right-4 bottom-24 z-50 h-14 w-14 rounded-full shadow-xl'
        )}
    >
        <Plus class="h-6 w-6" />
        <span class="sr-only">Create Activity</span>
    </Drawer.Trigger>
    <Drawer.Content>
        <div class="mx-auto w-full max-w-sm">
            <Drawer.Header>
                <Drawer.Title>Create Activity</Drawer.Title>
                <Drawer.Description>What would you like to track?</Drawer.Description>
            </Drawer.Header>
            <div class="grid grid-cols-3 gap-4 p-4">
                <Button
                    variant="outline"
                    class="flex h-24 flex-col items-center justify-center gap-2"
                >
                    <Check class="h-6 w-6 text-primary" />
                    <span>Habit</span>
                </Button>
                <Button
                    variant="outline"
                    class="flex h-24 flex-col items-center justify-center gap-2"
                >
                    <Flower2 class="h-6 w-6 text-green-500" />
                    <span>Plant</span>
                </Button>
                <Button
                    variant="outline"
                    class="flex h-24 flex-col items-center justify-center gap-2"
                >
                    <Dumbbell class="h-6 w-6 text-blue-500" />
                    <span>Workout</span>
                </Button>
            </div>
            <Drawer.Footer>
                <Drawer.Close class={buttonVariants({ variant: 'ghost' })}>Cancel</Drawer.Close>
            </Drawer.Footer>
        </div>
    </Drawer.Content>
</Drawer.Root>
