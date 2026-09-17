<script lang="ts">
  import Sidebar from '$lib/components/layout/sidebar.svelte';
  import Header from '$lib/components/layout/header.svelte';
  import { ShieldAlert } from "lucide-svelte";
  import { page } from '$app/stores';
  import Toaster from '$lib/components/ui/toast.svelte';
  import { applyPaletteTokens, getPalette } from '$lib/config/palettes';
  import { onMount } from 'svelte';
  
  let { data, children } = $props();
  
  let isFullscreen = $derived(
    $page.url.pathname === '/pos' || $page.url.pathname.startsWith('/pos/')
  );

  // Apply saved palette on mount
  onMount(() => {
    const paletteId = data.activeShop?.paletteId;
    if (paletteId) {
      const palette = getPalette(paletteId);
      const isDark = document.documentElement.classList.contains('dark');
      applyPaletteTokens(palette, isDark);
    }
  });
</script>

{#if data.apiDown}
  <div class="h-screen w-full flex flex-col items-center justify-center bg-background p-6">
    <div class="max-w-md w-full bg-card border shadow-lg rounded-xl p-8 text-center space-y-4">
      <div class="flex justify-center text-destructive mx-auto bg-destructive/10 p-3 rounded-full w-fit">
        <ShieldAlert size={32} />
      </div>
      <h2 class="text-xl font-bold">API Offline</h2>
      <p class="text-muted-foreground text-sm">
        We couldn't reach the server. This might be a DNS or connection issue.
      </p>
      <div class="pt-4">
        <button 
          class="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md font-medium text-sm transition-colors w-full"
          onclick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
{:else}
  <div class="relative flex h-screen w-full overflow-hidden bg-background">
    <!-- Interactive Navigation Sidebar -->
    <Sidebar />

    <!-- Core Layout Structure -->
    <div class="flex flex-1 flex-col overflow-hidden relative">
      
      <!-- Top Configuration and App Header -->
      <Header title="Dashboard" />
      
      <!-- Workspace Active Area -->
      <main class="flex-1 overflow-hidden relative">
        {#if isFullscreen}
          {@render children()}
        {:else}
          <div class="mx-auto w-full max-w-7xl h-full flex flex-col p-6 md:p-8 animate-fade-in">
            {@render children()}
          </div>
        {/if}

        {#if !isFullscreen}
          <!-- Premium Design: A subtle gradient orb in the background layer for depth -->
          <div class="fixed top-[20%] right-[10%] -z-10 h-96 w-96 rounded-full bg-primary/5 blur-3xl opacity-50 mix-blend-multiply pointer-events-none"></div>
        {/if}
      </main>
    </div>
  </div>

  <!-- Global Toast Notifications -->
  <Toaster />
{/if}
