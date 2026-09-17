<script lang="ts">
  import { auth } from '$lib/stores/auth.svelte';
  import { Button } from '$lib/components/ui/button';
  import * as Popover from '$lib/components/ui/popover';
  import * as Avatar from '$lib/components/ui/avatar';
  import { Search, Bell, ChevronDown } from 'lucide-svelte';
  import ThemeToggle from '$lib/components/theme/theme-toggle.svelte';

  // These would usually be tied to a router store to display dynamic titles
  let { title = "Dashboard" } = $props<{ title?: string }>();
</script>

<header class="sticky top-0 z-30 flex h-14 shrink-0 w-full items-center justify-between border-b border-border bg-background/85 px-6 backdrop-blur-md">
  
  <!-- Left Side: Path / Title Context -->
  <div class="flex items-center gap-2">
    <h1 class="text-[15px] font-bold tracking-tight text-foreground">{title}</h1>
  </div>

  <!-- Right Side: User Controls & Notifications -->
  <div class="flex items-center gap-1.5 ml-auto">
    <!-- Search / Command bar trigger -->
    <Button 
      variant="ghost" 
      class="gap-2 px-2.5 text-muted-foreground hover:text-foreground h-9"
    >
      <Search size={15} strokeWidth={1.75} />
      <span class="hidden md:inline text-[12px] font-medium">Search</span>
      <kbd class="hidden md:inline-flex items-center gap-0.5 text-[9.5px] font-mono px-1.5 py-0.5 rounded border border-border bg-secondary text-muted-foreground">
        ⌘K
      </kbd>
    </Button>

    <!-- Theme Toggle -->
    <ThemeToggle />

    <!-- Notification Bell -->
    <Button variant="ghost" size="icon" class="relative h-9 w-9 text-muted-foreground hover:text-foreground">
      <Bell size={16} strokeWidth={1.75} />
      <span class="absolute right-2.5 top-2 h-1.5 w-1.5 rounded-full bg-destructive"></span>
    </Button>

    <!-- User Profile Dropdown -->
    <Popover.Root>
      <Popover.Trigger>
        <div class="flex h-9 items-center gap-2 rounded-xl px-2 hover:bg-secondary transition-colors ml-1 cursor-pointer">
          <Avatar.Root class="h-6 w-6">
            <Avatar.Image src={auth.user?.avatar ?? "https://github.com/shadcn.png"} alt="User Avatar" />
            <Avatar.Fallback class="bg-primary/10 text-primary uppercase text-[10px] font-semibold">
              {auth.user?.name?.charAt(0) ?? 'U'}
            </Avatar.Fallback>
          </Avatar.Root>
          <ChevronDown size={12} strokeWidth={2} class="text-muted-foreground" />
        </div>
      </Popover.Trigger>
      
      <Popover.Content align="end" class="w-56 p-1 rounded-xl shadow-[0_10px_32px_0_rgba(0,0,0,0.12)]">
        <div class="px-3 py-2.5 border-b border-border mb-1">
          <p class="text-xs font-semibold truncate leading-none">{auth.user?.name ?? 'Guest User'}</p>
          <p class="text-[10px] text-muted-foreground truncate mt-1">
            {auth.user?.email ?? 'Not logged in'}
          </p>
          <span class="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 mt-2 text-[9px] font-semibold text-muted-foreground capitalize">
            {auth.role}
          </span>
        </div>
        
        <div class="p-1">
          <a href="/settings/general" class="flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-secondary transition-colors rounded-lg">
            Shop Settings
          </a>
          <button class="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors rounded-lg mt-1">
            Log out
          </button>
        </div>
      </Popover.Content>
    </Popover.Root>
  </div>

</header>
