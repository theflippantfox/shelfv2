<script lang="ts">
  import { toast } from "$lib/utils/toast";
  import { Store, Loader2, Phone, Percent } from "lucide-svelte";

  let { data }: { data: any } = $props();
  const shop = data.activeShop;

  let isSaving = $state(false);
  let formData = $state({
    name: shop.name,
    phone: shop.phone || "",
    email: shop.email || "",
    address: shop.address || "",
    defaultDiscountType: shop.defaultDiscountType || "none",
    defaultDiscountValue: shop.defaultDiscountValue || 0,
  });

  async function handleSave(e: Event) {
    e.preventDefault();
    isSaving = true;
    try {
      const resp = await data.client.shops[":id"].$patch({
        param: { id: shop.id },
        json: {
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          defaultDiscountType: formData.defaultDiscountType,
          defaultDiscountValue: Number(formData.defaultDiscountValue) || 0,
        },
      });
      if (resp.ok) { toast.success("Shop details saved!"); }
      else { const body = await resp.json(); toast.error((body as any).error || "Failed to save."); }
    } catch (e: any) { toast.error(e.message || "Network error."); }
    finally { isSaving = false; }
  }
</script>

<div class="space-y-8">
  <form onsubmit={handleSave} class="space-y-8">
    <!-- Shop Name -->
    <div>
      <div class="flex items-center gap-2 mb-3">
        <Store size={14} class="text-primary" />
        <h3 class="text-[13px] font-bold text-foreground">Shop Details</h3>
      </div>
      <div class="surface-card rounded-xl border border-border/40 p-5 space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Shop Name</label>
            <input class="input-field" bind:value={formData.name} required />
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Slug (read-only)</label>
            <input class="input-field bg-muted/40" value={shop.slug} disabled />
          </div>
        </div>
      </div>
    </div>

    <!-- Contact Info -->
    <div>
      <div class="flex items-center gap-2 mb-3">
        <Phone size={14} class="text-primary" />
        <h3 class="text-[13px] font-bold text-foreground">Contact Information</h3>
      </div>
      <div class="surface-card rounded-xl border border-border/40 p-5 space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Phone</label>
            <input class="input-field" bind:value={formData.phone} placeholder="+91 98765 43210" />
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email</label>
            <input class="input-field" type="email" bind:value={formData.email} placeholder="shop@example.com" />
          </div>
        </div>
        <div class="space-y-1.5">
          <label class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Address</label>
          <textarea class="input-field" bind:value={formData.address} rows="2" placeholder="Full shop address…"></textarea>
        </div>
      </div>
    </div>

    <!-- Default Discount -->
    <div>
      <div class="flex items-center gap-2 mb-3">
        <Percent size={14} class="text-primary" />
        <h3 class="text-[13px] font-bold text-foreground">Default Discount</h3>
      </div>
      <div class="surface-card rounded-xl border border-border/40 p-5">
        <p class="text-[11px] text-muted-foreground mb-3">Applied automatically to new sales (can be overridden per transaction).</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Type</label>
            <select class="input-field" bind:value={formData.defaultDiscountType}>
              <option value="none">No default discount</option>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount ({data.activeShop?.currencySymbol ?? '$'})</option>
            </select>
          </div>
          {#if formData.defaultDiscountType !== 'none'}
            <div class="space-y-1.5">
              <label class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Value {formData.defaultDiscountType === 'percentage' ? '(%)' : `(${data.activeShop?.currencySymbol ?? '$'})`}
              </label>
              <input class="input-field" type="number" min="0" max={formData.defaultDiscountType === 'percentage' ? '100' : undefined}
                bind:value={formData.defaultDiscountValue} />
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="flex justify-end pt-2">
      <button type="submit" class="btn-primary" disabled={isSaving}>
        {#if isSaving}<Loader2 size={14} class="mr-1.5 animate-spin" /> Saving…{:else}Save Changes{/if}
      </button>
    </div>
  </form>
</div>
