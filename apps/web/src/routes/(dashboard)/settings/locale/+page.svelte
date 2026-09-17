<script lang="ts">
  import { toast } from "$lib/utils/toast";
  import { Loader2 } from "lucide-svelte";

  let { data }: { data: any } = $props();
  const shop = data.activeShop;

  const timezones = [
    "UTC", "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore",
    "Europe/London", "America/New_York", "America/Los_Angeles", "Australia/Sydney",
  ];
  const dateFormats = [
    { value: "D MMM YYYY", label: "5 Jun 2025" },
    { value: "DD/MM/YYYY", label: "05/06/2025" },
    { value: "MM/DD/YYYY", label: "06/05/2025" },
    { value: "YYYY-MM-DD", label: "2025-06-05" },
  ];
  const timeFormats = [
    { value: "12h", label: "12-hour (3:30 PM)" },
    { value: "24h", label: "24-hour (15:30)" },
  ];

  let timezone = $state(shop.timezone ?? "UTC");
  let dateFormat = $state(shop.dateFormat ?? "D MMM YYYY");
  let timeFormat = $state(shop.timeFormat ?? "12h");
  let isSaving = $state(false);

  // Live preview
  const now = new Date();
  const previewDate = $derived.by(() => {
    const d = now;
    const day = d.getDate();
    const month = d.toLocaleString("en", { month: "short" });
    const year = d.getFullYear();
    const dd = String(day).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    switch (dateFormat) {
      case "DD/MM/YYYY": return `${dd}/${mm}/${year}`;
      case "MM/DD/YYYY": return `${mm}/${dd}/${year}`;
      case "YYYY-MM-DD": return `${year}-${mm}-${dd}`;
      default: return `${day} ${month} ${year}`;
    }
  });
  const previewTime = $derived.by(() => {
    const h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, "0");
    if (timeFormat === "24h") return `${String(h).padStart(2, "0")}:${m}`;
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${period}`;
  });

  async function save() {
    isSaving = true;
    try {
      const resp = await data.client.shops[":id"].$patch({
        param: { id: shop.id },
        json: { timezone, dateFormat, timeFormat },
      });
      if (resp.ok) toast.success("Locale settings saved!");
      else toast.error("Failed to save.");
    } catch { toast.error("Network error."); }
    finally { isSaving = false; }
  }
</script>

<div class="space-y-8">
  <!-- Timezone -->
  <div>
    <h3 class="text-[13px] font-bold text-foreground mb-3">Timezone</h3>
    <select
      bind:value={timezone}
      class="h-10 w-full max-w-sm rounded-lg bg-muted/20 border border-border/50 px-3 text-[13px] font-medium outline-none focus:border-primary/50 transition-colors"
    >
      {#each timezones as tz}
        <option value={tz}>{tz}</option>
      {/each}
    </select>
  </div>

  <!-- Date & Time Format -->
  <div>
    <h3 class="text-[13px] font-bold text-foreground mb-3">Date & Time Format</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg">
      <!-- Date -->
      <div class="space-y-2">
        <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Date</p>
        {#each dateFormats as f}
          <label class="flex items-center gap-2.5 cursor-pointer group">
            <input type="radio" name="date" value={f.value} bind:group={dateFormat}
              class="w-3.5 h-3.5 rounded-full border-border/60 text-primary focus:ring-primary/30" />
            <div>
              <span class="text-[12px] font-medium text-foreground">{f.label}</span>
              <span class="text-[10px] text-muted-foreground ml-2">{f.value}</span>
            </div>
          </label>
        {/each}
      </div>

      <!-- Time -->
      <div class="space-y-2">
        <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Time</p>
        {#each timeFormats as f}
          <label class="flex items-center gap-2.5 cursor-pointer group">
            <input type="radio" name="time" value={f.value} bind:group={timeFormat}
              class="w-3.5 h-3.5 rounded-full border-border/60 text-primary focus:ring-primary/30" />
            <span class="text-[12px] font-medium text-foreground">{f.label}</span>
          </label>
        {/each}
      </div>
    </div>
  </div>

  <!-- Live Preview -->
  <div>
    <h3 class="text-[13px] font-bold text-foreground mb-3">Preview</h3>
    <div class="inline-flex items-center gap-3 px-4 py-3 rounded-lg border border-border/40 bg-muted/20 font-mono text-[13px]">
      <span class="text-foreground font-semibold">{previewDate}</span>
      <span class="text-muted-foreground/40">·</span>
      <span class="text-muted-foreground">{previewTime}</span>
      <span class="text-muted-foreground/40">·</span>
      <span class="text-muted-foreground">{timezone.split("/").pop()}</span>
    </div>
  </div>

  <div class="flex justify-end">
    <button
      onclick={save}
      disabled={isSaving}
      class="inline-flex items-center justify-center h-9 px-6 rounded-lg bg-primary text-primary-foreground text-[12px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
    >
      {#if isSaving}<Loader2 class="mr-2 h-3.5 w-3.5 animate-spin" />{/if}
      Save Locale
    </button>
  </div>
</div>
