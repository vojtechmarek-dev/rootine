<script lang="ts">
    import { cn } from '$lib/utils';
    import { page } from '$app/state';
    import { goto } from '$app/navigation';
    import { ChartBar, House, User } from '@lucide/svelte';

    const navItems = [
        { href: '/', label: 'Dashboard', icon: House },
        { href: '/stats', label: 'Stats', icon: ChartBar },
        { href: '/profile', label: 'Profile', icon: User },
    ];

    function isActive(href: string): boolean {
        return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
    }

    function handleNavClick(href: string, event: MouseEvent) {
        event.preventDefault();
        goto(href);
    }
</script>

<nav
    class="fixed right-0 bottom-0 left-0 z-50 border-t border-border bg-card shadow-lg dark:border-border dark:bg-card"
    aria-label="Main navigation"
>
    <div class="mx-auto flex max-w-7xl items-center justify-around px-4 py-2">
        {#each navItems as item}
            {@const Icon = item.icon}
            {@const active = isActive(item.href)}
            <button
                type="button"
                onclick={(e) => handleNavClick(item.href, e)}
                class={cn(
                    'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-lg px-4 py-2 transition-colors',
                    active
                        ? 'text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
            >
                <Icon class="h-5 w-5" />
                <span class="text-xs font-medium">{item.label}</span>
            </button>
        {/each}
    </div>
</nav>
