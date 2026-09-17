<script lang="ts">
  import { toast } from "$lib/utils/toast";
  import { PALETTES, getPalette, applyPaletteTokens } from "$lib/config/palettes";
  import { Loader2, Sun, Moon, Monitor, Check } from "lucide-svelte";

  let { data }: { data: any } = $props();
  const shop = data.activeShop;

  let paletteId = $state(shop.paletteId ?? "graphite-mint");
  let themeMode = $state<'light' | 'dark' | 'system'>((shop.theme ?? "system") as any);
  let isSaving = $state(false);

  function applyPalette(id: string) {
    paletteId = id;
    if (typeof document === "undefined") return;
    const palette = getPalette(id);
    const isDark = document.documentElement.classList.contains("dark");
    applyPaletteTokens(palette, isDark);
  }

  function applyMode(mode: "light" | "dark" | "system") {
    themeMode = mode;
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (mode === "light") {
      root.classList.add("light");
    } else if (mode === "dark") {
      root.classList.add("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(prefersDark ? "dark" : "light");
    }
    // Re-apply current palette with new mode
    const palette = getPalette(paletteId);
    applyPaletteTokens(palette, mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));
  }

  async function save() {
    isSaving = true;
    try {
      const resp = await data.client.shops[":id"].$patch({
        param: { id: shop.id },
        json: { paletteId, theme: themeMode },
      });
      if (resp.ok) toast.success("Appearance saved!");
      else toast.error("Failed to save.");
    } catch { toast.error("Network error."); }
    finally { isSaving = false; }
  }
</script>

<div class="space-y-10">
  <!-- Palette Picker -->
  <div>
    <div class="flex items-baseline justify-between mb-4">
      <div>
        <h3 class="text-[13px] font-bold text-foreground">Palette</h3>
        <p class="text-[11px] text-muted-foreground mt-0.5">{PALETTES.length} presets — click to preview live</p>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {#each PALETTES as p (p.id)}
        {@const active = p.id === paletteId}
        <button
          type="button"
          onclick={() => applyPalette(p.id)}
          class="group relative text-left rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg
            {active ? 'border-foreground shadow-md ring-2 ring-foreground/10' : 'border-border/40 hover:border-border'}"
        >
          {#if active}
            <div class="absolute top-2.5 right-2.5 z-10 w-5 h-5 rounded-full bg-foreground flex items-center justify-center">
              <Check size={10} strokeWidth={3} class="text-background" />
            </div>
          {/if}

          <div class="relative">
            <!-- Light preview -->
            <div class="px-3 pt-3 pb-2" style="background:{p.light.bg}">
              <div class="flex gap-1.5">
                <div class="w-6 h-12 rounded-md flex flex-col items-center py-1 gap-0.5" style="background:{p.light.sidebarBg}">
                  <div class="w-2.5 h-2.5 rounded" style="background:{p.light.sidebarAccent}"></div>
                  <div class="w-4 h-0.5 rounded-sm" style="background:{p.light.sidebarMuted};opacity:0.5"></div>
                  <div class="w-3 h-0.5 rounded-sm" style="background:{p.light.sidebarMuted};opacity:0.3"></div>
                </div>
                <div class="flex-1 space-y-1">
                  <div class="h-1 rounded-sm" style="background:{p.light.text};width:55%;opacity:0.6"></div>
                  <div class="h-0.5 rounded-sm" style="background:{p.light.text3};width:35%;opacity:0.4"></div>
                  <div class="flex gap-0.5 mt-1.5">
                    <div class="px-1 py-0.5 rounded text-[6px] font-bold" style="background:{p.light.primary};color:{p.light.primaryFg}">BTN</div>
                    <div class="px-1 py-0.5 rounded text-[6px]" style="background:{p.light.surface2};color:{p.light.text2};border:1px solid {p.light.border}">TAG</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="h-0.5" style="background:linear-gradient(90deg,{p.accent},{p.accent}88)"></div>
            <!-- Dark preview -->
            <div class="px-3 pt-2 pb-2" style="background:{p.dark.bg}">
              <div class="flex gap-1.5">
                <div class="w-6 h-12 rounded-md flex flex-col items-center py-1 gap-0.5" style="background:{p.dark.sidebarBg}">
                  <div class="w-2.5 h-2.5 rounded" style="background:{p.dark.sidebarAccent}"></div>
                  <div class="w-4 h-0.5 rounded-sm" style="background:{p.dark.sidebarMuted};opacity:0.5"></div>
                  <div class="w-3 h-0.5 rounded-sm" style="background:{p.dark.sidebarMuted};opacity:0.3"></div>
                </div>
                <div class="flex-1 space-y-1">
                  <div class="h-1 rounded-sm" style="background:{p.dark.text};width:55%;opacity:0.6"></div>
                  <div class="h-0.5 rounded-sm" style="background:{p.dark.text3};width:35%;opacity:0.4"></div>
                  <div class="flex gap-0.5 mt-1.5">
                    <div class="px-1 py-0.5 rounded text-[6px] font-bold" style="background:{p.dark.primary};color:{p.dark.primaryFg}">BTN</div>
                    <div class="px-1 py-0.5 rounded text-[6px]" style="background:{p.dark.surface2};color:{p.dark.text2};border:1px solid {p.dark.border}">TAG</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Color strip -->
          <div class="flex h-6">
            <div class="flex-1" style="background:{p.light.primary}"></div>
            <div class="flex-1" style="background:{p.accent}"></div>
            <div class="flex-1" style="background:{p.dark.primary}"></div>
            <div class="flex-1" style="background:{p.light.sidebarBg}"></div>
            <div class="flex-1" style="background:{p.dark.sidebarBg}"></div>
          </div>

          <!-- Label -->
          <div class="px-3 py-2" style="background:{p.light.surface}">
            <p class="text-[12px] font-bold" style="color:{p.light.text}">{p.name}</p>
            <p class="text-[10px] italic" style="color:{p.light.text3}">{p.tagline}</p>
          </div>
        </button>
      {/each}
    </div>
  </div>

  <!-- Theme Mode -->
  <div>
    <h3 class="text-[13px] font-bold text-foreground mb-3">Theme</h3>
    <div class="grid grid-cols-3 gap-3 max-w-md">
      {#each [
        { value: "light" as const, label: "Light", icon: Sun, desc: "Bright and clean" },
        { value: "dark" as const, label: "Dark", icon: Moon, desc: "Easy on the eyes" },
        { value: "system" as const, label: "System", icon: Monitor, desc: "Match your OS" },
      ] as opt}
        {@const active = themeMode === opt.value}
        <button
          type="button"
          onclick={() => applyMode(opt.value)}
          class="relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200
            {active
              ? 'border-foreground bg-foreground/5 shadow-sm'
              : 'border-border/40 hover:border-border hover:bg-secondary/30'}"
        >
          <opt.icon size={20} class="{active ? 'text-foreground' : 'text-muted-foreground'}" />
          <div class="text-center">
            <p class="text-[12px] font-bold text-foreground">{opt.label}</p>
            <p class="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
          </div>
          {#if active}
            <div class="absolute top-2 right-2 w-2 h-2 rounded-full bg-foreground"></div>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <div class="flex justify-end">
    <button
      onclick={save}
      disabled={isSaving}
      class="inline-flex items-center justify-center h-9 px-6 rounded-lg bg-primary text-primary-foreground text-[12px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
    >
      {#if isSaving}<Loader2 class="mr-2 h-3.5 w-3.5 animate-spin" />{/if}
      Save Appearance
    </button>
  </div>
</div>
