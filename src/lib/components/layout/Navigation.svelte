<script lang="ts">
    import { page } from '$app/state';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { ChartBar, House, Sprout } from '@lucide/svelte';
    import { Button } from '$lib/components/ui/button/index.js';

    const navItems = [
        { href: '/', label: 'Dashboard', disabled: false, icon: House, badge: null },
        { href: '/roots', label: 'Roots', disabled: false, icon: Sprout, badge: null },
        { href: '/stats', label: 'Stats', disabled: true, icon: ChartBar, badge: 'Soon' },
        //{ href: '/profile', label: 'Profile', disabled: true, icon: User, badge: null },
    ] as const;

    type NavItem = (typeof navItems)[number];

    function isActive(href: NavItem['href']): boolean {
        return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
    }

    function handleNavClick(item: NavItem, event: MouseEvent) {
        event.preventDefault();
        if (item.disabled) {
            return;
        }

        goto(resolve(item.href));
    }
</script>

<nav class="fixed right-0 bottom-0 left-0 z-50 bg-surface-variant/70 shadow-ambient backdrop-blur-xl" aria-label="Main navigation">
    <div class="mx-auto flex max-w-7xl items-center justify-around px-4 py-2">
        {#each navItems as item (item.href)}
            {@const Icon = item.icon}
            {@const active = isActive(item.href)}
            <Button
                onclick={(e) => handleNavClick(item, e)}
                variant="ghost"
                size="icon"
                class="relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 transition-colors hover:bg-transparent hover:text-current"
                aria-label={item.badge ? `${item.label} (${item.badge.toLowerCase()})` : item.label}
                aria-current={active ? 'page' : undefined}
                disabled={item.disabled}
            >
                <Icon class="h-5 w-5" />
                <span class="text-xs font-medium">{item.label}</span>
                {#if item.badge}
                    <span
                        class="absolute -top-1 left-1/2 rounded-full bg-clay px-1.5 py-px text-[9px] leading-snug font-semibold text-clay-foreground"
                    >
                        {item.badge}
                    </span>
                {/if}
            </Button>
        {/each}
    </div>
</nav>
