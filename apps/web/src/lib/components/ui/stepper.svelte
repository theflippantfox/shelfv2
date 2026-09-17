<script lang="ts">
  import { Check } from 'lucide-svelte';

  interface Step {
    slug: string;
    label: string;
  }

  let {
    steps,
    current,
  }: { steps: Step[]; current: string } = $props();

  const currentIdx = $derived(steps.findIndex((s) => s.slug === current));
</script>

<nav class="w-full mb-8 select-none" aria-label="Onboarding progress">
  <ol class="flex items-center justify-between gap-1">
    {#each steps as s, i (s.slug)}
      {@const done   = i < currentIdx}
      {@const active = i === currentIdx}
      {@const last   = i === steps.length - 1}

      <li class="flex flex-col items-center min-w-0 flex-1">
        <div class="flex items-center w-full">
          <!-- Connector line (left) -->
          {#if i > 0}
            <div
              class="flex-1 h-px transition-colors {done || active ? 'bg-primary' : 'bg-border'}"
            ></div>
          {:else}
            <div class="flex-1"></div>
          {/if}

          <!-- Step circle -->
          <div
            class="relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 border
            {done ? 'bg-primary text-primary-foreground border-primary' 
            : active ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_0_4px_var(--color-primary-100)] dark:shadow-[0_0_0_4px_rgba(255,255,255,0.1)]' 
            : 'bg-muted text-muted-foreground border-border'}"
            aria-current={active ? 'step' : undefined}
          >
            {#if done}
              <Check size={14} strokeWidth={2.5} />
            {:else}
              {i + 1}
            {/if}
          </div>

          <!-- Connector line (right) -->
          {#if !last}
            <div
              class="flex-1 h-px transition-colors {done ? 'bg-primary' : 'bg-border'}"
            ></div>
          {:else}
            <div class="flex-1"></div>
          {/if}
        </div>

        <span
          class="mt-2 text-[11px] font-semibold text-center truncate w-full px-0.5
          {active ? 'text-foreground' : 'text-muted-foreground'}"
        >
          {s.label}
        </span>
      </li>
    {/each}
  </ol>
</nav>