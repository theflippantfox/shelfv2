<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Loader2 } from "lucide-svelte";
  import { toast } from "$lib/utils/toast";

  let { data }: { data: any } = $props();
  const shop = data.activeShop;

  let taxRateStr = $state(String(shop.taxRate ?? 0));
  let taxName = $state(shop.taxName ?? "Tax");
  let taxInclusive = $state(shop.taxInclusive ?? false);
  let isSaving = $state(false);

  const previewBase = 1000;
  const previewRate = $derived(parseFloat(taxRateStr) || 0);
  const previewTax = $derived(taxInclusive
    ? previewBase - previewBase / (1 + previewRate / 100)
    : previewBase * previewRate / 100);
  const previewTotal = $derived(taxInclusive ? previewBase : previewBase + previewTax);

  async function handleSave(e: Event) {
    e.preventDefault();
    isSaving = true;
    try {
      const resp = await data.client.shops[":id"].$patch({
        param: { id: shop.id },
        json: { taxRate: taxRateStr, taxName: taxName.trim(), taxInclusive },
      });
      if (resp.ok) { toast.success("Tax settings saved!"); }
      else { const body = await resp.json(); toast.error((body as any).error || "Failed to save."); }
    } catch (e: any) { toast.error(e.message || "Network error."); }
    finally { isSaving = false; }
  }
</script>

<div class="space-y-8">
  <form onsubmit={handleSave} class="space-y-6">
    <!-- Rate & Name -->
    <div>
      <h3 class="text-[13px] font-bold text-foreground mb-3">Configuration</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <Label for="taxRate" class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Rate (%)</Label>
          <Input id="taxRate" type="number" step="0.01" min="0" bind:value={taxRateStr} class="h-10 rounded-lg bg-muted/20 text-[13px] font-mono" placeholder="e.g. 18" />
        </div>
        <div class="space-y-1.5">
          <Label for="taxName" class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Name</Label>
          <Input id="taxName" bind:value={taxName} class="h-10 rounded-lg bg-muted/20 text-[13px]" placeholder="e.g. GST, VAT" />
        </div>
      </div>
    </div>

    <!-- Toggle -->
    <div>
      <h3 class="text-[13px] font-bold text-foreground mb-3">Pricing Mode</h3>
      <button
        type="button"
        onclick={() => (taxInclusive = !taxInclusive)}
        class="flex items-center gap-3 p-3.5 rounded-lg border border-border/40 hover:bg-secondary/30 transition-all w-full text-left"
      >
        <div class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors {taxInclusive ? 'bg-primary' : 'bg-muted'}">
          <span class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform {taxInclusive ? 'translate-x-4' : 'translate-x-0'}" />
        </div>
        <div>
          <p class="text-[12px] font-bold text-foreground">Tax-inclusive pricing</p>
          <p class="text-[11px] text-muted-foreground">
            {taxInclusive ? "Tax is extracted from the sale total." : "Tax is added on top of the sale total."}
          </p>
        </div>
      </button>
    </div>

    <!-- Preview -->
    {#if previewRate > 0}
      <div>
        <h3 class="text-[13px] font-bold text-foreground mb-3">Preview</h3>
        <div class="rounded-lg border border-border/40 divide-y divide-border/30 text-[12px] font-mono">
          <div class="flex justify-between px-4 py-2.5">
            <span class="text-muted-foreground">Base</span>
            <span class="text-foreground font-semibold">{data.activeShop?.currencySymbol ?? '$'}{previewBase.toFixed(2)}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5">
            <span class="text-muted-foreground">{taxName} ({previewRate}%)</span>
            <span class="text-foreground font-semibold">{data.activeShop?.currencySymbol ?? '$'}{previewTax.toFixed(2)}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5 bg-secondary/30">
            <span class="text-foreground font-bold">{taxInclusive ? 'Tax-extracted total' : 'Total with tax'}</span>
            <span class="text-foreground font-bold">{data.activeShop?.currencySymbol ?? '$'}{previewTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    {/if}

    <div class="flex justify-end pt-1">
      <Button type="submit" disabled={isSaving} class="h-9 px-6 rounded-lg text-[12px] font-bold">
        {#if isSaving}<Loader2 class="mr-2 h-3.5 w-3.5 animate-spin" />{/if}
        Save Tax Settings
      </Button>
    </div>
  </form>
</div>
