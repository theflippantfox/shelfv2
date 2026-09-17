<script lang="ts">
  import { Input } from "$lib/components/ui/input";
  import * as Sheet from "$lib/components/ui/sheet";
  import { Label } from "$lib/components/ui/label";
import { toast } from "$lib/utils/toast";
  import { 
    Plus, Search, Package, Pencil, Trash2, ArrowUpDown, 
    Wallet, AlertTriangle, X, Loader2, PackagePlus
  } from "lucide-svelte";
  
  let { data }: { data: any } = $props();

  /* ── State ────────────────────────────────────────── */
  let search = $state("");
  let filterCat = $state("");
  type StockFilter = "all" | "in" | "low" | "out";
  let stockFilter = $state<StockFilter>("all");
  let products = $state<any[]>(data.products ?? []);
  type SortKey = "name-asc" | "name-desc" | "stock-asc" | "stock-desc";
  let sortKey = $state<SortKey>("name-asc");

  // Dialog state
  let showDialog = $state(false);
  let editingId = $state<string | null>(null);
  let isSaving = $state(false);
  let saveError = $state<string | null>(null);

  let form = $state({
    name: "", sku: "", price: "", costPrice: "",
    qty: 0, unit: "unit", categoryId: "" as string | null,
    description: "", lowStockThreshold: 5,
  });

  /* ── Derived ──────────────────────────────────────── */
  const thresholdOf = (p: any) => p.lowStockThreshold ?? 5;

  const stockStats = $derived.by(() => {
    const all = products as any[];
    return {
      total: all.length,
      inStock: all.filter(p => p.qty > thresholdOf(p)).length,
      low: all.filter(p => p.qty > 0 && p.qty <= thresholdOf(p)).length,
      out: all.filter(p => p.qty === 0).length,
      value: all.reduce((s: number, p: any) => s + (Number(p.price) || 0) * (p.qty || 0), 0),
      costValue: all.reduce((s: number, p: any) => s + (Number(p.costPrice) || 0) * (p.qty || 0), 0),
    };
  });

  const filtered = $derived.by(() => {
    let list = [...products] as any[];
    
    // Search
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Category
    if (filterCat) list = list.filter(p => p.categoryId === filterCat);

    // Stock filter
    if (stockFilter === "in") list = list.filter(p => p.qty > thresholdOf(p));
    if (stockFilter === "low") list = list.filter(p => p.qty > 0 && p.qty <= thresholdOf(p));
    if (stockFilter === "out") list = list.filter(p => p.qty === 0);

    // Sort
    switch (sortKey) {
      case "name-asc": list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "name-desc": list.sort((a, b) => b.name.localeCompare(a.name)); break;
      case "stock-asc": list.sort((a, b) => a.qty - b.qty); break;
      case "stock-desc": list.sort((a, b) => b.qty - a.qty); break;
    }

    return list;
  });

  const activeFilterCount = $derived(
    (search.trim() ? 1 : 0) + (filterCat ? 1 : 0) + (stockFilter !== "all" ? 1 : 0)
  );

  function clearAll() { search = ""; filterCat = ""; stockFilter = "all"; }

  /* ── Helpers ──────────────────────────────────────── */
  function formatPrice(val: number | string): string {
    return new Intl.NumberFormat("en-IN", {
      style: "currency", currency: data.activeShop.currencyCode || "INR",
    }).format(Number(val));
  }

  function getCategoryName(id: string | null): string {
    if (!id) return "Uncategorized";
    return data.categories.find((c: any) => c.id === id)?.name ?? "Unknown";
  }

  function getStockBadge(p: any) {
    const t = thresholdOf(p);
    if (p.qty === 0) return { label: "Out of stock", cls: "text-white bg-destructive" };
    if (p.qty <= t) return { label: `Low — ${p.qty}`, cls: "text-white bg-amber-500" };
    return { label: "In stock", cls: "text-white bg-emerald-500" };
  }

  function stockPct(p: any): number {
    const cap = Math.max(thresholdOf(p) * 3, 30);
    return Math.min(100, Math.round((p.qty / cap) * 100));
  }

  function stockBarColor(p: any): string {
    if (p.qty === 0) return "hsl(var(--destructive))";
    if (p.qty <= thresholdOf(p)) return "hsl(38 92% 50%)";
    return "hsl(142 71% 45%)";
  }

  function marginPct(p: any): number | null {
    if (!p.costPrice || !p.price) return null;
    return Math.round(((Number(p.price) - Number(p.costPrice)) / Number(p.price)) * 100);
  }

  /* ── Actions ──────────────────────────────────────── */
  function openCreate() {
    editingId = null;
    saveError = null;
    form = {
      name: "", sku: "", price: "", costPrice: "",
      qty: 0, unit: "unit", categoryId: filterCat || null,
      description: "", lowStockThreshold: 5,
    };
    showDialog = true;
  }

  function openEdit(p: any) {
    editingId = p.id;
    saveError = null;
    form = {
      name: p.name, sku: p.sku || "", price: String(p.price),
      costPrice: p.costPrice || "", qty: p.qty, unit: p.unit,
      categoryId: p.categoryId || null, description: p.description || "",
      lowStockThreshold: p.lowStockThreshold ?? 5,
    };
    showDialog = true;
  }

  async function saveProduct() {
    if (!form.name.trim() || !form.price) return;
    isSaving = true;
    saveError = null;
    try {
      const payload = {
        shopId: data.activeShop.id,
        name: form.name.trim(),
        categoryId: form.categoryId || null,
        sku: form.sku.trim() || null,
        price: form.price.toString(),
        costPrice: form.costPrice.toString() || null,
        qty: Number(form.qty),
        unit: form.unit.trim() || "unit",
        lowStockThreshold: Number(form.lowStockThreshold),
        description: form.description.trim() || null,
      };
      let resp;
      if (editingId) {
        resp = await data.client.products[":id"].$patch({ param: { id: editingId }, json: payload });
      } else {
        resp = await data.client.products.$post({ json: payload });
      }
      if (resp.ok) {
        const saved = await resp.json();
        const newProduct = (saved as any).product ?? (saved as any).data ?? saved;
        if (editingId) {
          products = products.map((p: any) => p.id === editingId ? { ...p, ...payload, id: editingId } : p);
        } else {
          products = [...products, { ...payload, id: newProduct?.id ?? crypto.randomUUID() }];
        }
        toast.success(editingId ? "Product updated!" : "Product created!");
        showDialog = false;
        editingId = null;
        form = { name: "", sku: "", price: "", costPrice: "", qty: 0, unit: "unit", categoryId: null, description: "", lowStockThreshold: 5 };
      } else {
        const body = await resp.json();
        saveError = (body as any).error || "Failed to save.";
      }
    } catch (e: any) {
      saveError = e.message || "Network error.";
    } finally {
      isSaving = false;
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Archive this product? Sales history is preserved.")) return;
    try {
      const resp = await data.client.products[":id"].$delete({ param: { id } });
      if (resp.ok) {
        products = products.filter((p: any) => p.id !== id);
        toast.success("Product archived.");
      }
    } catch (e) {
      console.error("Delete failed:", e);
    }
  }

  /* ── Chip styling ─────────────────────────────────── */
  const stockChips: { key: StockFilter; label: string; tone: string }[] = [
    { key: "all", label: "All", tone: "neutral" },
    { key: "in",  label: "In stock", tone: "teal" },
    { key: "low", label: "Low", tone: "gold" },
    { key: "out", label: "Out", tone: "crimson" },
  ];

  function chipCount(key: StockFilter): number {
    if (key === "all") return stockStats.total;
    if (key === "in")  return stockStats.inStock;
    if (key === "low") return stockStats.low;
    return stockStats.out;
  }
</script>

<svelte:head><title>Inventory | shëlf</title></svelte:head>

<div class="flex flex-col h-full max-h-full gap-4">
  <!-- Header -->
  <div class="shrink-0 flex items-end justify-between gap-3">
    <div class="flex-1 min-w-0">
      <h1 class="display-lg text-foreground">Inventory</h1>
    </div>
    <div class="flex gap-2 shrink-0">
      <button class="h-9 px-3 rounded-lg bg-secondary text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-secondary/80 transition-colors" onclick={openCreate}>
        <PackagePlus size={14} /> Restock
      </button>
      <button class="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-primary/90 transition-colors" onclick={openCreate}>
        <Plus size={14} /> Add Product
      </button>
    </div>
  </div>

  <!-- KPI strip -->
  <div class="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
    <div class="surface-card p-3 rounded-xl border border-border/40">
      <div class="flex items-center gap-2 mb-1.5">
        <div class="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
          <Package size={13} class="text-primary" />
        </div>
        <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Products</span>
      </div>
      <p class="text-[22px] font-black tabular-nums leading-none text-foreground">{stockStats.total}</p>
      <p class="text-[10px] text-muted-foreground mt-1">In catalog</p>
    </div>
    <div class="surface-card p-3 rounded-xl border border-border/40">
      <div class="flex items-center gap-2 mb-1.5">
        <div class="w-7 h-7 rounded-md bg-[hsl(222,100%,59%)]/10 flex items-center justify-center">
          <Wallet size={13} class="text-[hsl(222,100%,59%)]" />
        </div>
        <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stock Value</span>
      </div>
      <p class="text-[22px] font-black tabular-nums leading-none text-foreground">{formatPrice(stockStats.value)}</p>
      <p class="text-[10px] text-muted-foreground mt-1">At selling price</p>
    </div>
    <div class="surface-card p-3 rounded-xl border border-border/40">
      <div class="flex items-center gap-2 mb-1.5">
        <div class="w-7 h-7 rounded-md {stockStats.low > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'} flex items-center justify-center">
          <AlertTriangle size={13} class="{stockStats.low > 0 ? 'text-amber-500' : 'text-emerald-500'}" />
        </div>
        <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Low Stock</span>
      </div>
      <p class="text-[22px] font-black tabular-nums leading-none text-foreground">{stockStats.low}</p>
      <p class="text-[10px] text-muted-foreground mt-1">{stockStats.low > 0 ? 'Needs restocking' : 'All good'}</p>
    </div>
    <div class="surface-card p-3 rounded-xl border border-border/40">
      <div class="flex items-center gap-2 mb-1.5">
        <div class="w-7 h-7 rounded-md {stockStats.out > 0 ? 'bg-destructive/10' : 'bg-emerald-500/10'} flex items-center justify-center">
          <Package size={13} class="{stockStats.out > 0 ? 'text-destructive' : 'text-emerald-500'}" />
        </div>
        <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Out of Stock</span>
      </div>
      <p class="text-[22px] font-black tabular-nums leading-none text-foreground">{stockStats.out}</p>
      <p class="text-[10px] text-muted-foreground mt-1">{stockStats.out > 0 ? 'Cannot fulfill' : 'All good'}</p>
    </div>
  </div>

  <!-- Filter bar -->
  <div class="shrink-0 surface-card p-3 rounded-xl border border-border/40">
    <div class="flex flex-col md:flex-row md:items-center gap-3">
      <div class="relative flex-1 group">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" size={14} />
        <input
          placeholder="Search by name, SKU or description…"
          bind:value={search}
          class="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border/50 text-[12px] font-medium outline-none focus:border-primary/50 transition-colors"
        />
      </div>
      <select
        bind:value={filterCat}
        class="h-9 px-3 rounded-lg bg-background border border-border/50 text-[12px] font-semibold text-foreground outline-none focus:border-primary/50 transition-colors min-w-[140px]"
      >
        <option value="">All categories</option>
        {#each data.categories as cat}
          <option value={cat.id}>{cat.name}</option>
        {/each}
      </select>
      <div class="relative">
        <ArrowUpDown size={12} class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <select
          bind:value={sortKey}
          class="h-9 pl-8 pr-3 rounded-lg bg-background border border-border/50 text-[12px] font-semibold text-foreground outline-none focus:border-primary/50 transition-colors min-w-[150px]"
        >
          <option value="name-asc">Name · A → Z</option>
          <option value="name-desc">Name · Z → A</option>
          <option value="stock-desc">Stock · High → Low</option>
          <option value="stock-asc">Stock · Low → High</option>
        </select>
      </div>
    </div>

    <!-- Stock chips + clear -->
    <div class="flex items-center justify-between gap-2 mt-3 flex-wrap">
      <div class="flex items-center gap-1.5 flex-wrap">
        {#each stockChips as chip}
          {@const active = stockFilter === chip.key}
          {@const count = chipCount(chip.key)}
          <button
            type="button"
            onclick={() => (stockFilter = chip.key)}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-full border transition-all
              {active
                ? chip.tone === 'teal' ? 'bg-emerald-500 text-white border-emerald-500'
                  : chip.tone === 'gold' ? 'bg-amber-500 text-white border-amber-500'
                  : chip.tone === 'crimson' ? 'bg-destructive text-white border-destructive'
                  : 'bg-secondary text-foreground border-secondary'
                : 'bg-transparent text-muted-foreground border-border/50 hover:border-border hover:bg-secondary/50'}"
          >
            {chip.label}
            <span class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold
              {active ? 'bg-white/20 text-white' : 'bg-secondary text-muted-foreground'}">
              {count}
            </span>
          </button>
        {/each}
      </div>
      {#if activeFilterCount > 0}
        <button onclick={clearAll} class="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors">
          <X size={12} /> Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
        </button>
      {/if}
    </div>
  </div>

  <!-- Results count -->
  <div class="text-[11px] text-muted-foreground px-1">
    Showing <span class="font-bold text-foreground">{filtered.length}</span> of {stockStats.total} products
  </div>

  <!-- Product cards grid -->
  {#if filtered.length === 0}
    <div class="flex flex-col items-center justify-center h-48 text-muted-foreground surface-card rounded-xl border border-dashed border-border/60">
      <Package size={32} class="mb-4 opacity-20" />
      <p class="text-[13px] font-semibold">No products found.</p>
      {#if search || filterCat || stockFilter !== "all"}
        <button class="text-[11px] text-primary mt-2 font-bold" onclick={clearAll}>Clear filters</button>
      {/if}
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {#each filtered as p (p.id)}
        {@const badge = getStockBadge(p)}
        {@const pct = stockPct(p)}
        {@const margin = marginPct(p)}
        <div class="surface-card p-4 rounded-xl border border-border/40 group hover:border-border/80 transition-all hover:shadow-sm">
          <!-- Top: icon + name + actions -->
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-lg bg-secondary flex-shrink-0 flex items-center justify-center">
              <Package size={16} class="text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[13px] font-semibold truncate text-foreground" title={p.name}>{p.name}</p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="font-mono text-[10px] text-muted-foreground">{p.sku || "—"}</span>
                <span class="text-[10px] text-muted-foreground/50">·</span>
                <span class="text-[10px] text-muted-foreground truncate">{getCategoryName(p.categoryId)}</span>
              </div>
            </div>
            <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Edit" onclick={() => openEdit(p)}>
                <Pencil size={13} />
              </button>
              <button class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Archive" onclick={() => deleteProduct(p.id)}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          <!-- Price row -->
          <div class="flex items-baseline justify-between mt-3">
            <p class="text-lg font-black tabular-nums text-foreground">{formatPrice(p.price)}</p>
            {#if margin !== null}
              <span class="text-[10px] font-bold {margin >= 30 ? 'text-emerald-500' : margin >= 15 ? 'text-amber-500' : 'text-destructive'}">
                {margin}% margin
              </span>
            {/if}
          </div>

          <!-- Stock section -->
          <div class="mt-3">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Stock</span>
              <span class="text-[12px] font-bold tabular-nums text-foreground">
                {p.qty}<span class="text-muted-foreground font-normal text-[10px]"> {p.unit}</span>
              </span>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div class="h-full rounded-full transition-all" style="width:{pct}%; background:{stockBarColor(p)}"></div>
              </div>
              <span class="text-[10px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap {badge.cls}">{badge.label}</span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Product Create/Edit Sheet -->
<Sheet.Root bind:open={showDialog}>
  <Sheet.Content class="sm:max-w-lg overflow-y-auto p-0">
    <!-- Header -->
    <div class="px-6 pt-6 pb-4 border-b border-border/40">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-[16px] font-extrabold text-foreground">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
          <p class="text-[11px] text-muted-foreground mt-0.5">{editingId ? 'Update product details and pricing.' : 'Fill in the details for your catalog.'}</p>
        </div>
        <div class="flex items-center gap-2">
          {#if editingId}
            <!-- Live margin preview in header -->
            {@const previewMargin = form.price && form.costPrice ? Math.round(((Number(form.price) - Number(form.costPrice)) / Number(form.price)) * 100) : null}
            {#if previewMargin !== null}
              <span class="text-[10px] font-bold rounded-full px-2 py-0.5 {previewMargin >= 30 ? 'bg-emerald-500/10 text-emerald-500' : previewMargin >= 15 ? 'bg-amber-500/10 text-amber-500' : 'bg-destructive/10 text-destructive'}">
                {previewMargin}% margin
              </span>
            {/if}
          {/if}
        </div>
      </div>
    </div>

    <form onsubmit={(e) => { e.preventDefault(); saveProduct(); }} class="px-6 py-5 space-y-5">
      {#if saveError}
        <div class="rounded-lg bg-destructive/10 p-3 text-[11px] font-semibold text-destructive border border-destructive/20 flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-destructive shrink-0"></div>
          {saveError}
        </div>
      {/if}

      <!-- ─── Section: Identity ─── -->
      <div>
        <h3 class="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">Product Identity</h3>
        <div class="space-y-3">
          <!-- Name -->
          <div class="space-y-1.5">
            <Label for="name" class="text-[11px] font-bold text-foreground">Product Name <span class="text-destructive">*</span></Label>
            <Input id="name" bind:value={form.name} required placeholder="e.g. Luxe Lipstick" class="h-9 text-[13px]" />
          </div>
          <!-- SKU + Category -->
          <div class="grid grid-cols-5 gap-3">
            <div class="col-span-2 space-y-1.5">
              <Label for="sku" class="text-[11px] font-bold text-foreground">SKU</Label>
              <Input id="sku" bind:value={form.sku} placeholder="PRD-001" class="h-9 text-[13px] font-mono" />
            </div>
            <div class="col-span-3 space-y-1.5">
              <Label for="category" class="text-[11px] font-bold text-foreground">Category</Label>
              <select
                id="category"
                bind:value={form.categoryId}
                class="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-[12px] font-semibold shadow-sm outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">No category</option>
                {#each data.categories as cat}
                  <option value={cat.id}>{cat.name}</option>
                {/each}
              </select>
            </div>
          </div>
          <!-- Description -->
          <div class="space-y-1.5">
            <Label for="description" class="text-[11px] font-bold text-foreground">Description</Label>
            <textarea
              id="description"
              bind:value={form.description}
              rows="2"
              placeholder="Optional notes about this product"
              class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-[12px] shadow-sm outline-none focus:ring-1 focus:ring-ring resize-none"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- ─── Section: Pricing ─── -->
      <div>
        <h3 class="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">Pricing</h3>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label for="price" class="text-[11px] font-bold text-foreground">Retail Price <span class="text-destructive">*</span></Label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-muted-foreground">{data.activeShop.currencySymbol || '₹'}</span>
              <Input id="price" type="number" step="0.01" min="0" bind:value={form.price} class="pl-8 h-9 text-[13px] tabular font-bold" required />
            </div>
          </div>
          <div class="space-y-1.5">
            <Label for="costPrice" class="text-[11px] font-bold text-foreground">Cost Price</Label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-muted-foreground">{data.activeShop.currencySymbol || '₹'}</span>
              <Input id="costPrice" type="number" step="0.01" min="0" bind:value={form.costPrice} class="pl-8 h-9 text-[13px] tabular" />
            </div>
          </div>
        </div>
        <!-- Margin preview -->
        {#if form.price && form.costPrice}
          {@const previewMargin = Math.round(((Number(form.price) - Number(form.costPrice)) / Number(form.price)) * 100)}
          {@const profit = (Number(form.price) - Number(form.costPrice)).toFixed(2)}
          <div class="mt-2.5 rounded-lg bg-secondary/50 border border-border/30 px-3 py-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Profit per unit</span>
            <div class="flex items-center gap-2">
              <span class="text-[12px] font-bold tabular-nums text-foreground">{data.activeShop.currencySymbol || '₹'}{profit}</span>
              <span class="text-[10px] font-bold rounded-full px-1.5 py-0.5 {previewMargin >= 30 ? 'bg-emerald-500/10 text-emerald-500' : previewMargin >= 15 ? 'bg-amber-500/10 text-amber-500' : 'bg-destructive/10 text-destructive'}">
                {previewMargin}%
              </span>
            </div>
          </div>
        {/if}
      </div>

      <!-- ─── Section: Inventory ─── -->
      <div>
        <h3 class="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">Inventory</h3>
        <div class="grid grid-cols-3 gap-3">
          <div class="space-y-1.5">
            <Label for="qty" class="text-[11px] font-bold text-foreground">Stock <span class="text-destructive">*</span></Label>
            <Input id="qty" type="number" bind:value={form.qty} min="0" required class="h-9 text-[13px] tabular font-bold" />
          </div>
          <div class="space-y-1.5">
            <Label for="unit" class="text-[11px] font-bold text-foreground">Unit</Label>
            <Input id="unit" bind:value={form.unit} placeholder="piece" class="h-9 text-[13px]" />
          </div>
          <div class="space-y-1.5">
            <Label for="threshold" class="text-[11px] font-bold text-foreground">Low Alert</Label>
            <Input id="threshold" type="number" bind:value={form.lowStockThreshold} min="0" class="h-9 text-[13px] tabular" />
          </div>
        </div>
        <!-- Stock visual -->
        {#if editingId}
          {@const previewStock = Number(form.qty)}
          {@const previewThreshold = Number(form.lowStockThreshold) || 5}
          {@const previewPct = Math.min(100, Math.round((previewStock / Math.max(previewThreshold * 3, 30)) * 100))}
          {@const previewColor = previewStock === 0 ? 'hsl(var(--destructive))' : previewStock <= previewThreshold ? 'hsl(38 92% 50%)' : 'hsl(142 71% 45%)'}
          <div class="mt-2.5">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] text-muted-foreground">{previewStock} {form.unit} in stock</span>
              <span class="text-[10px] font-bold {previewStock === 0 ? 'text-destructive' : previewStock <= previewThreshold ? 'text-amber-500' : 'text-emerald-500'}">
                {previewStock === 0 ? 'Out of stock' : previewStock <= previewThreshold ? 'Low stock' : 'In stock'}
              </span>
            </div>
            <div class="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div class="h-full rounded-full transition-all" style="width:{previewPct}%; background:{previewColor}"></div>
            </div>
          </div>
        {/if}
      </div>

      <!-- ─── Actions ─── -->
      <div class="flex flex-col gap-2 pt-3 border-t border-border/40">
        <button
          type="submit"
          class="w-full h-11 rounded-lg bg-primary text-primary-foreground font-extrabold text-[12px] uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSaving || !form.name || !form.price}
        >
          {#if isSaving}<Loader2 class="inline mr-2 h-3.5 w-3.5 animate-spin" />{/if}
          {editingId ? 'Save Changes' : 'Create Product'}
        </button>
        {#if editingId}
          <button
            type="button"
            class="w-full h-10 rounded-lg bg-destructive/10 text-destructive font-bold text-[11px] uppercase tracking-wider hover:bg-destructive/20 transition-colors disabled:opacity-50"
            disabled={isSaving}
            onclick={() => deleteProduct(editingId!)}
          >
            <Trash2 class="inline mr-2 h-3.5 w-3.5" /> Archive Product
          </button>
        {/if}
      </div>
    </form>
  </Sheet.Content>
</Sheet.Root>
