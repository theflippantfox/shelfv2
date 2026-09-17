<script lang="ts">
  import { Store, Globe, Palette, Percent, Receipt, Tag, Users, ArrowRight } from "lucide-svelte";

  const sections = [
    { href: "/settings/general",     icon: Store,   label: "Shop Details",   desc: "Name, currency, and regional settings",  color: "#3b82f6" },
    { href: "/settings/appearance",  icon: Palette, label: "Appearance",      desc: "Theme, keyboard shortcuts",              color: "#8b5cf6" },
    { href: "/settings/locale",      icon: Globe,   label: "Locale",          desc: "Timezone, date & time format",           color: "#06b6d4" },
    { href: "/settings/taxes",       icon: Percent, label: "Taxes",           desc: "Tax rate, name, inclusive pricing",       color: "#f59e0b" },
    { href: "/settings/receipt",     icon: Receipt, label: "Receipt",         desc: "Header and footer text",                 color: "#84cc16" },
    { href: "/settings/categories",  icon: Tag,     label: "Categories",      desc: "Organize products into groups",          color: "#f43f5e" },
    { href: "/settings/team",        icon: Users,   label: "Team",            desc: "Manage staff and permissions",           color: "#a855f7" },
  ];
</script>

<svelte:head><title>Settings · shëlf</title></svelte:head>

<div class="h-full max-h-full overflow-y-auto">
  <div class="max-w-2xl">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="display-lg text-foreground">Settings</h1>
      <p class="text-[13px] text-muted-foreground mt-1.5">Manage your shop preferences and workspace.</p>
    </div>

    <!-- Settings grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {#each sections as s}
        <a
          href={s.href}
          class="group surface-card rounded-xl border border-border/40 p-5 transition-all duration-200 hover:border-border hover:shadow-md hover:-translate-y-0.5"
        >
          <div class="flex items-start gap-4">
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
              style="background: {s.color}12"
            >
              <s.icon size={18} style="color: {s.color}" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <p class="text-[13px] font-bold text-foreground">{s.label}</p>
                <ArrowRight
                  size={14}
                  class="text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-200"
                />
              </div>
              <p class="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        </a>
      {/each}
    </div>
  </div>
</div>
