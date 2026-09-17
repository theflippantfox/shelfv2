<script lang="ts">
  import { toast } from "$lib/utils/toast";
  import {
    Truck, PackagePlus, AlertTriangle, Plus, Check, X,
    ArrowUpDown, Trash2, Warehouse
  } from "lucide-svelte";

  let { data }: { data: any } = $props();

  let suppliers = $state<any[]>(data.suppliers ?? []);
  let purchaseOrders = $state<any[]>(data.purchaseOrders ?? []);
  let lowStockProducts = $state<any[]>(data.lowStockProducts ?? []);
  let adjustments = $state<any[]>(data.adjustments ?? []);

  let activeTab = $state<"overview" | "suppliers" | "orders" | "lowstock">("overview");
  let showNewSupplier = $state(false);
  let showNewPO = $state(false);
  let showAdjust = $state(false);
  let adjustProduct = $state<any>(null);

  // Supplier form
  let sForm = $state({ name: "", contactName: "", phone: "", email: "", notes: "" });

  // PO form
  let poForm = $state({ supplierId: "", notes: "", items: [{ productName: "", qty: 1, unitCost: 0 }] });

  // Adjustment form
  let adjForm = $state({ adjustmentQty: 0, reason: "manual" as string, notes: "" });

  const REASON_LABELS: Record<string, string> = {
    manual: "Manual Count", damaged: "Damaged", expired: "Expired",
    count_correction: "Count Correction", returned: "Returned",
  };

  const STATUS_COLORS: Record<string, string> = {
    draft: "bg-secondary text-muted-foreground",
    ordered: "bg-blue-500/10 text-blue-600",
    received: "bg-emerald-500/10 text-emerald-600",
    cancelled: "bg-rose-500/10 text-rose-500",
  };

  function fmt(n: number): string {
    const locale = data.activeShop?.currencyLocale ?? "en-US";
    const currency = data.activeShop?.currencyCode ?? "USD";
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  }

  async function createSupplier() {
    if (!sForm.name.trim()) return;
    const activeShop = data.activeShop;
    if (!activeShop) return;
    try {
      const resp = await data.client.suppliers.$post({ json: { shopId: activeShop.id, ...sForm, paymentTerms: "net30", currencyCode: activeShop.currencyCode } });
      if (resp.ok) {
        const created = await resp.json();
        suppliers = [created, ...suppliers];
        showNewSupplier = false;
        sForm = { name: "", contactName: "", phone: "", email: "", notes: "" };
        toast.success("Supplier created");
      }
    } catch { toast.error("Failed to create supplier"); }
  }

  async function deleteSupplier(id: string) {
    try {
      const resp = await data.client.suppliers[`:any`].$delete({ param: { id } });
      if (resp.ok) {
        suppliers = suppliers.filter((s) => s.id !== id);
        toast.success("Supplier deleted");
      }
    } catch { toast.error("Failed to delete supplier"); }
  }

  async function createPO() {
    const activeShop = data.activeShop;
    if (!activeShop || !poForm.supplierId) return;
    const validItems = poForm.items.filter((i) => i.productName && i.qty > 0 && i.unitCost > 0);
    if (validItems.length === 0) return;
    try {
      const resp = await data.client["purchase-orders"].$post({
        json: { shopId: activeShop.id, supplierId: poForm.supplierId, notes: poForm.notes, items: validItems },
      });
      if (resp.ok) {
        const created = await resp.json();
        purchaseOrders = [created, ...purchaseOrders];
        showNewPO = false;
        poForm = { supplierId: "", notes: "", items: [{ productName: "", qty: 1, unitCost: 0 }] };
        toast.success("Purchase order created");
      }
    } catch { toast.error("Failed to create PO"); }
  }

  async function updatePOStatus(id: string, status: string) {
    try {
      const resp = await data.client["purchase-orders"][`:any`].status.$patch({ param: { id }, json: { status } });
      if (resp.ok) {
        purchaseOrders = purchaseOrders.map((po) => po.id === id ? { ...po, status } : po);
        toast.success(`PO marked as ${status}`);
      }
    } catch { toast.error("Failed to update PO"); }
  }

  async function createAdjustment() {
    const activeShop = data.activeShop;
    if (!activeShop || !adjustProduct) return;
    try {
      const resp = await data.client["stock-adjustments"].$post({
        json: { shopId: activeShop.id, productId: adjustProduct.id, ...adjForm },
      });
      if (resp.ok) {
        const created = await resp.json();
        adjustments = [created, ...adjustments];
        // Update local product qty
        lowStockProducts = lowStockProducts.map((p) =>
          p.id === adjustProduct.id ? { ...p, qty: created.newQty } : p
        );
        showAdjust = false;
        adjustProduct = null;
        adjForm = { adjustmentQty: 0, reason: "manual", notes: "" };
        toast.success("Stock adjusted");
      }
    } catch { toast.error("Failed to adjust stock"); }
  }
</script>

<div class="h-full max-h-full overflow-y-auto">
  <div class="mx-auto w-full max-w-7xl space-y-6 animate-fade-in p-6 md:p-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-[22px] md:text-[26px] font-bold tracking-tight">Restocking Hub</h1>
        <p class="text-[12px] text-muted-foreground mt-1">Manage suppliers, purchase orders, and low-stock alerts</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 bg-secondary/30 p-1 rounded-lg w-fit">
      {#each [
        { key: "overview", label: "Overview", icon: Warehouse },
        { key: "suppliers", label: "Suppliers", icon: Truck },
        { key: "orders", label: "Purchase Orders", icon: PackagePlus },
        { key: "lowstock", label: "Low Stock", icon: AlertTriangle },
      ] as tab}
        {@const isActive = activeTab === tab.key}
        <button
          onclick={() => activeTab = tab.key as typeof activeTab}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all
            {isActive ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
        >
          <tab.icon size={13} />
          {tab.label}
          {#if tab.key === 'lowstock' && lowStockProducts.length > 0}
            <span class="ml-1 px-1.5 py-0 rounded-full text-[9px] font-bold bg-rose-500 text-white">{lowStockProducts.length}</span>
          {/if}
        </button>
      {/each}
    </div>

    <!-- ── OVERVIEW ──────────────────────────────────────────────── -->
    {#if activeTab === 'overview'}
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="surface-card p-4 rounded-xl border border-border/40">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 mb-2">
            <Truck size={15} class="text-primary" />
          </div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Suppliers</p>
          <p class="text-[20px] font-extrabold">{suppliers.length}</p>
        </div>
        <div class="surface-card p-4 rounded-xl border border-border/40">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10 mb-2">
            <PackagePlus size={15} class="text-blue-600" />
          </div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active POs</p>
          <p class="text-[20px] font-extrabold">{purchaseOrders.filter((p) => p.status === 'ordered').length}</p>
        </div>
        <div class="surface-card p-4 rounded-xl border border-border/40">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 mb-2">
            <Check size={15} class="text-emerald-600" />
          </div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Received</p>
          <p class="text-[20px] font-extrabold">{purchaseOrders.filter((p) => p.status === 'received').length}</p>
        </div>
        <div class="surface-card p-4 rounded-xl border border-border/40">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-500/10 mb-2">
            <AlertTriangle size={15} class="text-rose-500" />
          </div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Low Stock</p>
          <p class="text-[20px] font-extrabold {lowStockProducts.length > 0 ? 'text-rose-500' : ''}">{lowStockProducts.length}</p>
        </div>
      </div>

      <!-- Low stock alerts (compact) -->
      {#if lowStockProducts.length > 0}
        <div class="surface-card rounded-xl border border-border/40 p-5">
          <div class="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} class="text-rose-500" />
            <h3 class="text-[13px] font-bold text-foreground">Low Stock Alerts</h3>
          </div>
          <div class="space-y-2">
            {#each lowStockProducts.slice(0, 5) as prod}
              <div class="flex items-center justify-between py-2 px-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
                <span class="text-[12px] font-semibold text-foreground">{prod.name}</span>
                <div class="flex items-center gap-3">
                  <span class="text-[11px] text-muted-foreground">{prod.qty} left</span>
                  <button
                    class="text-[10px] font-bold text-primary hover:underline"
                    onclick={() => { adjustProduct = prod; adjForm.adjustmentQty = 0; showAdjust = true; }}
                  >Adjust</button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Recent POs (compact) -->
      {#if purchaseOrders.length > 0}
        <div class="surface-card rounded-xl border border-border/40 p-5">
          <h3 class="text-[13px] font-bold text-foreground mb-3">Recent Purchase Orders</h3>
          <div class="space-y-2">
            {#each purchaseOrders.slice(0, 5) as po}
              <div class="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/20">
                <div class="flex items-center gap-3">
                  <span class="text-[12px] font-mono font-semibold text-foreground">{po.orderNumber}</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold {STATUS_COLORS[po.status] ?? ''}">{po.status}</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-[11px] text-muted-foreground">{po.supplierName ?? '—'}</span>
                  <span class="text-[12px] font-bold tabular-nums">{fmt(parseFloat(po.totalAmount))}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}

    <!-- ── SUPPLIERS ─────────────────────────────────────────────── -->
    {#if activeTab === 'suppliers'}
      <div class="flex justify-end">
        <button class="btn-primary" onclick={() => showNewSupplier = true}>
          <Plus size={14} /> Add Supplier
        </button>
      </div>

      {#if suppliers.length === 0}
        <div class="surface-card rounded-xl border border-border/40 p-12 text-center">
          <Truck size={32} class="mx-auto text-muted-foreground mb-3" />
          <p class="text-[13px] font-semibold text-foreground mb-1">No suppliers yet</p>
          <p class="text-[11px] text-muted-foreground mb-4">Add your first supplier to start tracking restocking</p>
          <button class="btn-primary" onclick={() => showNewSupplier = true}>
            <Plus size={14} /> Add Supplier
          </button>
        </div>
      {:else}
        <div class="space-y-2">
          {#each suppliers as s}
            <div class="surface-card rounded-xl border border-border/40 p-4 flex items-center justify-between">
              <div>
                <p class="text-[13px] font-semibold text-foreground">{s.name}</p>
                <div class="flex items-center gap-3 mt-1">
                  {#if s.contactName}<span class="text-[11px] text-muted-foreground">{s.contactName}</span>{/if}
                  {#if s.phone}<span class="text-[11px] text-muted-foreground">📞 {s.phone}</span>{/if}
                  {#if s.email}<span class="text-[11px] text-muted-foreground">✉️ {s.email}</span>{/if}
                </div>
              </div>
              <button class="p-1.5 rounded-md hover:bg-rose-500/10 transition-colors" onclick={() => deleteSupplier(s.id)}>
                <Trash2 size={13} class="text-rose-500" />
              </button>
            </div>
          {/each}
        </div>
      {/if}
    {/if}

    <!-- ── PURCHASE ORDERS ───────────────────────────────────────── -->
    {#if activeTab === 'orders'}
      <div class="flex justify-end">
        <button class="btn-primary" onclick={() => showNewPO = true} disabled={suppliers.length === 0}>
          <Plus size={14} /> New Purchase Order
        </button>
      </div>

      {#if purchaseOrders.length === 0}
        <div class="surface-card rounded-xl border border-border/40 p-12 text-center">
          <PackagePlus size={32} class="mx-auto text-muted-foreground mb-3" />
          <p class="text-[13px] font-semibold text-foreground mb-1">No purchase orders</p>
          <p class="text-[11px] text-muted-foreground mb-4">{suppliers.length === 0 ? 'Add a supplier first' : 'Create your first PO to track restocking'}</p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each purchaseOrders as po}
            <div class="surface-card rounded-xl border border-border/40 p-4">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3">
                  <span class="text-[13px] font-mono font-bold text-foreground">{po.orderNumber}</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold {STATUS_COLORS[po.status] ?? ''}">{po.status}</span>
                </div>
                <span class="text-[14px] font-extrabold tabular-nums">{fmt(parseFloat(po.totalAmount))}</span>
              </div>
              <div class="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span>{po.supplierName ?? 'Unknown'}</span>
                {#if po.expectedDate}<span>Due: {new Date(po.expectedDate).toLocaleDateString()}</span>{/if}
                <span>{po.items?.length ?? 0} items</span>
              </div>
              {#if po.status === 'draft'}
                <div class="flex gap-2 mt-3 pt-3 border-t border-border/20">
                  <button class="btn-sm bg-blue-500/10 text-blue-600 hover:bg-blue-500/20" onclick={() => updatePOStatus(po.id, 'ordered')}>
                    Mark as Ordered
                  </button>
                  <button class="btn-sm bg-rose-500/10 text-rose-500 hover:bg-rose-500/20" onclick={() => updatePOStatus(po.id, 'cancelled')}>
                    Cancel
                  </button>
                </div>
              {:else if po.status === 'ordered'}
                <div class="flex gap-2 mt-3 pt-3 border-t border-border/20">
                  <button class="btn-sm bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" onclick={() => updatePOStatus(po.id, 'received')}>
                    <Check size={12} /> Mark as Received
                  </button>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    {/if}

    <!-- ── LOW STOCK ─────────────────────────────────────────────── -->
    {#if activeTab === 'lowstock'}
      {#if lowStockProducts.length === 0}
        <div class="surface-card rounded-xl border border-border/40 p-12 text-center">
          <AlertTriangle size={32} class="mx-auto text-emerald-500 mb-3" />
          <p class="text-[13px] font-semibold text-foreground mb-1">All stocked up</p>
          <p class="text-[11px] text-muted-foreground">No products are below their low-stock threshold</p>
        </div>
      {:else}
        <div class="space-y-2">
          {#each lowStockProducts as prod}
            <div class="surface-card rounded-xl border border-border/40 p-4 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center
                  {prod.qty === 0 ? 'bg-rose-500/10' : 'bg-amber-500/10'}">
                  <Warehouse size={16} class="{prod.qty === 0 ? 'text-rose-500' : 'text-amber-600'}" />
                </div>
                <div>
                  <p class="text-[13px] font-semibold text-foreground">{prod.name}</p>
                  <p class="text-[11px] text-muted-foreground">
                    {prod.qty} in stock · threshold: {prod.lowStockThreshold ?? 5}
                    {#if prod.costPrice && parseFloat(prod.costPrice) > 0} · cost: {fmt(parseFloat(prod.costPrice))}{/if}
                  </p>
                </div>
              </div>
              <button class="btn-sm bg-primary/10 text-primary hover:bg-primary/20" onclick={() => { adjustProduct = prod; adjForm.adjustmentQty = 0; showAdjust = true; }}>
                <ArrowUpDown size={12} /> Adjust
              </button>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Recent adjustments -->
      {#if adjustments.length > 0}
        <div class="surface-card rounded-xl border border-border/40 p-5 mt-4">
          <h3 class="text-[13px] font-bold text-foreground mb-3">Recent Adjustments</h3>
          <div class="space-y-1.5">
            {#each adjustments.slice(0, 10) as adj}
              <div class="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/20">
                <div class="flex items-center gap-3">
                  <span class="text-[12px] font-semibold text-foreground">{adj.productName ?? '—'}</span>
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-bold {adj.adjustmentQty > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500'}">
                    {adj.adjustmentQty > 0 ? '+' : ''}{adj.adjustmentQty}
                  </span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-[10px] text-muted-foreground">{REASON_LABELS[adj.reason] ?? adj.reason}</span>
                  <span class="text-[11px] text-muted-foreground">{adj.previousQty} → {adj.newQty}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- ── NEW SUPPLIER DIALOG ──────────────────────────────────── -->
{#if showNewSupplier}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
    <div class="bg-background border border-border/40 rounded-xl w-full max-w-md mx-4 p-6 animate-scale-in">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-[16px] font-bold">Add Supplier</h3>
        <button onclick={() => showNewSupplier = false} class="p-1 rounded-md hover:bg-secondary"><X size={16} /></button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="text-[11px] font-bold text-muted-foreground mb-1 block">Name *</label>
          <input class="input-field" bind:value={sForm.name} placeholder="Supplier name" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-[11px] font-bold text-muted-foreground mb-1 block">Contact Person</label>
            <input class="input-field" bind:value={sForm.contactName} placeholder="Contact name" />
          </div>
          <div>
            <label class="text-[11px] font-bold text-muted-foreground mb-1 block">Phone</label>
            <input class="input-field" bind:value={sForm.phone} placeholder="Phone number" />
          </div>
        </div>
        <div>
          <label class="text-[11px] font-bold text-muted-foreground mb-1 block">Email</label>
          <input class="input-field" bind:value={sForm.email} placeholder="Email address" />
        </div>
        <div>
          <label class="text-[11px] font-bold text-muted-foreground mb-1 block">Notes</label>
          <textarea class="input-field" bind:value={sForm.notes} rows="2" placeholder="Any notes…"></textarea>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-5">
        <button class="btn-secondary" onclick={() => showNewSupplier = false}>Cancel</button>
        <button class="btn-primary" onclick={createSupplier} disabled={!sForm.name.trim()}>Create Supplier</button>
      </div>
    </div>
  </div>
{/if}

<!-- ── NEW PO DIALOG ────────────────────────────────────────── -->
{#if showNewPO}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
    <div class="bg-background border border-border/40 rounded-xl w-full max-w-lg mx-4 p-6 animate-scale-in max-h-[80vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-[16px] font-bold">New Purchase Order</h3>
        <button onclick={() => showNewPO = false} class="p-1 rounded-md hover:bg-secondary"><X size={16} /></button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="text-[11px] font-bold text-muted-foreground mb-1 block">Supplier *</label>
          <select class="input-field" bind:value={poForm.supplierId}>
            <option value="">Select supplier…</option>
            {#each suppliers as s}
              <option value={s.id}>{s.name}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="text-[11px] font-bold text-muted-foreground mb-1 block">Notes</label>
          <input class="input-field" bind:value={poForm.notes} placeholder="PO notes" />
        </div>
        <div>
          <label class="text-[11px] font-bold text-muted-foreground mb-2 block">Items</label>
          {#each poForm.items as _, idx}
            <div class="grid grid-cols-[1fr_60px_80px_30px] gap-2 mb-2">
              <input class="input-field text-[12px]" bind:value={poForm.items[idx].productName} placeholder="Product name" />
              <input class="input-field text-[12px]" type="number" bind:value={poForm.items[idx].qty} min="1" placeholder="Qty" />
              <input class="input-field text-[12px]" type="number" bind:value={poForm.items[idx].unitCost} min="0" placeholder="Cost" />
              {#if poForm.items.length > 1}
                <button class="text-rose-500 hover:text-rose-600" onclick={() => poForm.items.splice(idx, 1)}>
                  <X size={14} />
                </button>
              {/if}
            </div>
          {/each}
          <button class="text-[11px] font-bold text-primary hover:underline" onclick={() => poForm.items.push({ productName: "", qty: 1, unitCost: 0 })}>
            + Add item
          </button>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-5">
        <button class="btn-secondary" onclick={() => showNewPO = false}>Cancel</button>
        <button class="btn-primary" onclick={createPO} disabled={!poForm.supplierId}>Create PO</button>
      </div>
    </div>
  </div>
{/if}

<!-- ── ADJUST STOCK DIALOG ──────────────────────────────────── -->
{#if showAdjust && adjustProduct}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
    <div class="bg-background border border-border/40 rounded-xl w-full max-w-sm mx-4 p-6 animate-scale-in">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-[16px] font-bold">Adjust Stock</h3>
        <button onclick={() => { showAdjust = false; adjustProduct = null; }} class="p-1 rounded-md hover:bg-secondary"><X size={16} /></button>
      </div>
      <div class="surface-card rounded-lg p-3 mb-4">
        <p class="text-[13px] font-semibold text-foreground">{adjustProduct.name}</p>
        <p class="text-[11px] text-muted-foreground">Current stock: <span class="font-bold">{adjustProduct.qty}</span></p>
      </div>
      <div class="space-y-3">
        <div>
          <label class="text-[11px] font-bold text-muted-foreground mb-1 block">Adjustment (+ to add, − to subtract)</label>
          <input class="input-field" type="number" bind:value={adjForm.adjustmentQty} placeholder="0" />
          <p class="text-[10px] text-muted-foreground mt-1">New stock: {adjustProduct.qty + adjForm.adjustmentQty}</p>
        </div>
        <div>
          <label class="text-[11px] font-bold text-muted-foreground mb-1 block">Reason *</label>
          <select class="input-field" bind:value={adjForm.reason}>
            {#each Object.entries(REASON_LABELS) as [key, label]}
              <option value={key}>{label}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="text-[11px] font-bold text-muted-foreground mb-1 block">Notes</label>
          <textarea class="input-field" bind:value={adjForm.notes} rows="2" placeholder="Optional notes…"></textarea>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-5">
        <button class="btn-secondary" onclick={() => { showAdjust = false; adjustProduct = null; }}>Cancel</button>
        <button class="btn-primary" onclick={createAdjustment} disabled={adjustProduct.qty + adjForm.adjustmentQty < 0}>
          Apply Adjustment
        </button>
      </div>
    </div>
  </div>
{/if}
