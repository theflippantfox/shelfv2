<script lang="ts">
  import { flip } from "svelte/animate";
  import { fly } from "svelte/transition";
  import { X, CheckCircle2, AlertCircle, Info } from "lucide-svelte";

  interface Toast {
    id: number;
    message: string;
    variant: "success" | "error" | "info";
  }

  // Expose getters/setters for external callers via a simple global on window
  let _id = 0;
  let toasts = $state<Toast[]>([]);

  // Register globally so addToast/toastStore can push into this component's state
  if (typeof window !== "undefined") {
    (window as any).__shelf_toasts = {
      add(message: string, variant: Toast["variant"] = "info") {
        const id = ++_id;
        toasts.push({ id, message, variant });
        setTimeout(() => {
          const idx = toasts.findIndex((t) => t.id === id);
          if (idx !== -1) toasts.splice(idx, 1);
        }, 3500);
      },
    };
  }
</script>

{#if toasts.length > 0}
  <div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
    {#each toasts as toast (toast.id)}
      <div
        class="pointer-events-auto flex items-center gap-3 rounded-xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl px-4 py-3 min-w-[280px] max-w-[420px] animate-fade-in"
        animate:flip={{ duration: 250 }}
        transition:fly={{ x: 80, duration: 300 }}
      >
        <div class="shrink-0">
          {#if toast.variant === "success"}
            <CheckCircle2 size={16} class="text-emerald-500" />
          {:else if toast.variant === "error"}
            <AlertCircle size={16} class="text-destructive" />
          {:else}
            <Info size={16} class="text-primary" />
          {/if}
        </div>
        <p class="flex-1 text-[12px] font-semibold text-foreground">{toast.message}</p>
        <button
          class="shrink-0 p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground"
          onclick={() => {
            const idx = toasts.findIndex((t) => t.id === toast.id);
            if (idx !== -1) toasts.splice(idx, 1);
          }}
        >
          <X size={12} />
        </button>
      </div>
    {/each}
  </div>
{/if}
