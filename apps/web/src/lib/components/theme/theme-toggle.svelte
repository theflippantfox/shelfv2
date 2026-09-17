<script lang="ts">
  import { Sun, Moon, Monitor } from 'lucide-svelte';
  import { toggleMode, resetMode } from 'mode-watcher';
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    <Button variant="ghost" size="icon" class="relative group">
      <Sun class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all text-muted-foreground group-hover:text-foreground dark:-rotate-90 dark:scale-0" />
      <Moon class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all text-muted-foreground group-hover:text-foreground dark:rotate-0 dark:scale-100" />
      <span class="sr-only">Toggle theme</span>
    </Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end" class="min-w-[120px]">
    <DropdownMenu.Item onclick={() => toggleMode()} class="cursor-pointer gap-2">
      <Sun size={16} /> Light
    </DropdownMenu.Item>
    <DropdownMenu.Item onclick={() => toggleMode()} class="cursor-pointer gap-2">
      <Moon size={16} /> Dark
    </DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item onclick={() => resetMode()} class="cursor-pointer gap-2">
      <Monitor size={16} /> System
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
