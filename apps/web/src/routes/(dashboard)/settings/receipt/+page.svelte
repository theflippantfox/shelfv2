<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label";
  import { Loader2 } from "lucide-svelte";
  import { toast } from "$lib/utils/toast";

  let { data }: { data: any } = $props();
  const shop = data.activeShop;

  let header = $state(shop.receiptHeader || "");
  let footer = $state(shop.receiptFooter || "Thank you for your purchase!");
  let isSaving = $state(false);

  async function handleSave(e: Event) {
    e.preventDefault();
    isSaving = true;
    try {
      const resp = await data.client.shops[":id"].$patch({
        param: { id: shop.id },
        json: { receiptHeader: header.trim() || null, receiptFooter: footer.trim() || null },
      });
      if (resp.ok) { toast.success("Receipt settings saved!"); }
      else { const body = await resp.json(); toast.error((body as any).error || "Failed to save."); }
    } catch (e: any) { toast.error(e.message || "Network error."); }
    finally { isSaving = false; }
  }
</script>

<div class="space-y-8">
  <form onsubmit={handleSave} class="space-y-6">
    <div>
      <h3 class="text-[13px] font-bold text-foreground mb-3">Receipt Content</h3>
      <div class="space-y-4">
        <div class="space-y-1.5">
          <Label for="receiptHeader" class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Header</Label>
          <textarea
            id="receiptHeader"
            bind:value={header}
            rows="3"
            placeholder="e.g. {shop.name}, Main Street, Mumbai..."
            class="w-full rounded-lg bg-muted/20 border border-border/50 px-3 py-2.5 text-[13px] font-medium outline-none focus:border-primary/50 transition-colors resize-none"
          ></textarea>
          <p class="text-[10px] text-muted-foreground">Appears at the top of every receipt.</p>
        </div>

        <div class="space-y-1.5">
          <Label for="receiptFooter" class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Footer</Label>
          <textarea
            id="receiptFooter"
            bind:value={footer}
            rows="3"
            placeholder="e.g. Thank you for shopping with us!"
            class="w-full rounded-lg bg-muted/20 border border-border/50 px-3 py-2.5 text-[13px] font-medium outline-none focus:border-primary/50 transition-colors resize-none"
          ></textarea>
          <p class="text-[10px] text-muted-foreground">Appears at the bottom of every receipt.</p>
        </div>
      </div>
    </div>

    <!-- Preview -->
    <div>
      <h3 class="text-[13px] font-bold text-foreground mb-3">Preview</h3>
      <div class="rounded-lg border border-border/40 p-4 font-mono text-[11px] text-muted-foreground space-y-2">
        {#if header}
          <div class="border-b border-dashed border-border/40 pb-2 whitespace-pre-wrap">{header}</div>
        {/if}
        <div class="text-center py-3 text-muted-foreground/40 text-[10px] uppercase tracking-wider">— items —</div>
        {#if footer}
          <div class="border-t border-dashed border-border/40 pt-2 text-center whitespace-pre-wrap">{footer}</div>
        {/if}
      </div>
    </div>

    <div class="flex justify-end pt-1">
      <Button type="submit" disabled={isSaving} class="h-9 px-6 rounded-lg text-[12px] font-bold">
        {#if isSaving}<Loader2 class="mr-2 h-3.5 w-3.5 animate-spin" />{/if}
        Save Receipt Settings
      </Button>
    </div>
  </form>
</div>
