<script lang="ts">
    import LoginForm from '@/components/auth/LoginForm.svelte';
    import { Sprout } from '@lucide/svelte';

    let { form } = $props<{
        form?: { error?: string };
    }>();
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-6 py-12">
    <div class="w-full max-w-sm space-y-10">
        <div class="space-y-4 text-center">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-ambient">
                <Sprout class="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 class="font-serif text-5xl font-semibold tracking-tight text-foreground italic">Rootine</h1>
            <p class="text-sm text-muted-foreground">Habits that take root — track your routines, plants, and workouts.</p>
        </div>

        <LoginForm error={form?.error} />

        <p class="text-center text-xs text-muted-foreground">By signing in, you agree to our Terms of Service and Privacy Policy</p>
    </div>
</div>
