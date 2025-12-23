<script lang="ts">
    import LoginForm from '@/components/organisms/LoginForm.svelte';

    let { form } = $props<{
        form?: { error?: string };
    }>();
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-4 py-12">
    <div class="w-full max-w-md space-y-8">
        <div class="text-center">
            <h1 class="text-3xl font-bold tracking-tight text-foreground">Welcome to Rootine</h1>
            <p class="mt-2 text-sm text-muted-foreground">
                Sign in to track your habits, plants, and workouts
            </p>
        </div>

        <LoginForm error={form?.error} />

        <p class="text-center text-xs text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
    </div>
</div>
