<script lang="ts">
  import { page } from '$app/state';
  import { cn } from '$lib/utils';
  import { 
    LayoutDashboard, 
    PackageSearch, 
    Settings,
    LogOut,
    Calculator,
    ReceiptText,
    Users,
    BarChart3,
    Warehouse,
    Menu,
    X
  } from 'lucide-svelte';

  let sidebarOpen = $state(false);

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard, section: 'Main' },
    { name: 'Point of Sale', href: '/pos', icon: Calculator, section: 'Main' },
    { name: 'Products', href: '/products', icon: PackageSearch, section: 'Stock' },
    { name: 'Restocking', href: '/restocking', icon: Warehouse, section: 'Stock' },
    { name: 'Transactions', href: '/transactions', icon: ReceiptText, section: 'Records' },
    { name: 'Customers', href: '/customers', icon: Users, section: 'Records' },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, section: 'Records' },
    { name: 'Settings', href: '/settings', icon: Settings, section: 'Config' },
  ];

  const groupedNav = $derived.by(() => {
    const g: Record<string, typeof navItems> = {};
    for (const item of navItems) {
      if (!g[item.section]) g[item.section] = [];
      g[item.section].push(item);
    }
    return g;
  });

  function closeSidebar() {
    sidebarOpen = false;
  }
</script>

<style>
  .sidebar-active-indicator {
    content: '';
    position: absolute;
    left: -8px;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 0;
    background: hsl(var(--primary));
    border-radius: 0 99px 99px 0;
    transition: height 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .is-active .sidebar-active-indicator {
    height: 22px;
  }
  .sidebar-backdrop {
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
  }
</style>

<!-- Mobile hamburger -->
<button
  class="fixed top-4 left-4 z-50 md:hidden w-10 h-10 rounded-lg border flex items-center justify-center shadow-lg active:scale-95 transition-transform"
  style="background:hsl(var(--sidebar-bg));color:hsl(var(--sidebar-text));border-color:hsl(var(--border) / 0.3)"
  onclick={() => sidebarOpen = !sidebarOpen}
>
  {#if sidebarOpen}
    <X size={18} />
  {:else}
    <Menu size={18} />
  {/if}
</button>

<!-- Mobile backdrop -->
{#if sidebarOpen}
  <div
    class="fixed inset-0 z-40 sidebar-backdrop md:hidden animate-fade-in"
    onclick={closeSidebar}
    role="button"
    tabindex="-1"
    onkeydown={(e) => { if (e.key === 'Escape') closeSidebar(); }}
  ></div>
{/if}

<!-- Sidebar -->
<aside
  class={cn(
    "flex w-64 flex-col border-r backdrop-blur-3xl shrink-0",
    "fixed md:relative inset-y-0 left-0 z-50 md:z-auto",
    "transition-transform duration-300 ease-out",
    sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
  )}
  style="background:hsl(var(--sidebar-bg));color:hsl(var(--sidebar-text));border-color:hsl(var(--border) / 0.3)"
>
  <!-- Brand -->
  <div
    class="flex h-20 shrink-0 items-center gap-3 px-8 border-b"
    style="border-color:hsl(var(--border) / 0.2)"
  >
    <div
      class="flex h-7 w-7 items-center justify-center rounded-lg font-serif text-sm"
      style="background:hsl(var(--primary));color:hsl(var(--primary-foreground));box-shadow:0 0 0 4px hsl(var(--primary) / 0.18)"
    >
      S
    </div>
    <span class="text-xl font-serif tracking-tight leading-none" style="color:hsl(var(--sidebar-text))">
      Shëlf<span style="color:hsl(var(--primary))">.</span>
    </span>
  </div>

  <!-- Nav -->
  <div class="flex-1 overflow-y-auto py-6 px-4">
    <div class="space-y-6 pl-2">
      {#each Object.entries(groupedNav) as [section, items]}
        <div class="space-y-1.5">
          <h4
            class="mb-3 px-2 text-[10px] font-bold uppercase tracking-[1.2px]"
            style="color:hsl(var(--sidebar-muted))"
          >
            {section}
          </h4>

          {#each items as item}
            {@const isActive = page.url.pathname === item.href || page.url.pathname.startsWith(item.href + '/')}
            <a
              href={item.href}
              onclick={closeSidebar}
              class={cn(
                "group flex items-center relative gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-300 w-full",
                isActive ? "is-active font-semibold" : ""
              )}
              style={isActive
                ? "background:hsl(var(--sidebar-active));color:hsl(var(--sidebar-text))"
                : "color:hsl(var(--sidebar-muted))"
              }
            >
              <div class="sidebar-active-indicator"></div>
              <item.icon
                size={17}
                strokeWidth={isActive ? 2.5 : 1.75}
                class={cn(
                  "transition-all duration-200 shrink-0",
                  isActive ? "scale-100" : "group-hover:scale-110"
                )}
                style={isActive
                  ? "color:hsl(var(--sidebar-accent))"
                  : "color:hsl(var(--sidebar-muted))"
                }
              />
              {item.name}
            </a>
          {/each}
        </div>
      {/each}
    </div>
  </div>

  <!-- Footer -->
  <div class="mt-auto p-4 border-t" style="border-color:hsl(var(--border) / 0.2)">
    <button
      class="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-white/[0.05]"
      style="color:hsl(var(--sidebar-muted))"
    >
      <LogOut size={16} strokeWidth={1.75} class="transition-colors group-hover:scale-110" />
      Sign out
    </button>
  </div>
</aside>
