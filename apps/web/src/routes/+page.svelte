<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    goto('/dashboard', { replaceState: true });
  });
</script>

<div class="h-screen w-full flex items-center justify-center bg-background">
  <div class="flex flex-col items-center gap-3">
    <div class="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
      S
    </div>
    <p class="text-[12px] text-muted-foreground">Redirecting…</p>
  </div>
</div>
