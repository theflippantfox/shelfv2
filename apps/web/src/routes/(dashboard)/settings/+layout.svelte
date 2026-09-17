<script lang="ts">
  import { page } from "$app/state";
  import { ArrowLeft } from "lucide-svelte";

  let { children } = $props();
</script>

<svelte:head>
  <title>Settings | shëlf</title>
</svelte:head>

<div class="h-full max-h-full overflow-y-auto">
  <div class="max-w-2xl">
    <!-- Back link on sub-pages -->
    {#if page.url.pathname !== "/settings"}
      <div class="pb-6">
        <a href="/settings" class="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={13} /> All Settings
        </a>
      </div>
    {/if}

    {@render children()}
  </div>
</div>
