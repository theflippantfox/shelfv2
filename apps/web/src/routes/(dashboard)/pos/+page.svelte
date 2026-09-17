<script lang="ts">
  import { Input } from "$lib/components/ui/input";
  import { 
    Search, 
    Plus, 
    Minus, 
    Trash2, 
    ShoppingCart,
    Banknote,
    ArrowLeftRight,
    Clock,
    ChevronDown,
    User
  } from "lucide-svelte";
  import { toast } from "$lib/utils/toast";
  
  let { data }: { data: any } = $props();
  
  let searchQuery = $state("");
  let selectedCategoryId = $state<string | null>(null);
  let cart = $state<Array<{ product: any, qty: number }>>([]);
  let isProcessing = $state(false);

  // Discount & round-off
  let discountStr = $state("");
  let roundOff = $state(0);

  // Split payment amounts
  let cashAmt = $state("");
  let upiAmt = $state("");
  let creditAmt = $state("");

  // Customer picker
  let showCustPicker = $state(false);
  let customerId = $state<string | null>(null);
  let customerName = $state("");
  let customerSearch = $state("");

  let filteredProducts = $derived(
    data.products.filter((p: any) => {
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = !selectedCategoryId || p.categoryId === selectedCategoryId;
      return matchSearch && matchCategory && p.qty > 0;
    })
  );

  let filteredCustomers = $derived(
    !customerSearch.trim()
      ? (data.customers ?? []).slice(0, 8)
      : (data.customers ?? []).filter((c: any) =>
          c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.phone?.includes(customerSearch)
        ).slice(0, 8)
  );

  let cartSubtotal = $derived(
    cart.reduce((sum, item) => sum + (Number(item.product.price) * item.qty), 0)
  );

  let discountType = $derived(discountStr.includes("%") ? "percent" : "amount");

  let discountAmount = $derived.by(() => {
    const v = parseFloat(discountStr);
    if (isNaN(v) || v <= 0) return 0;
    if (discountType === "percent") return Math.round((cartSubtotal * v / 100) * 100) / 100;
    return Math.min(v, cartSubtotal);
  });

  let afterDiscount = $derived(Math.max(0, cartSubtotal - discountAmount));

  let taxRatePercent = $derived(Number(data.activeShop.taxRate) || 0);
  let isTaxInclusive = $derived(data.activeShop.taxInclusive === true);
  
  let taxAmount = $derived(
    isTaxInclusive 
      ? afterDiscount - (afterDiscount / (1 + (taxRatePercent / 100))) 
      : afterDiscount * (taxRatePercent / 100)
  );

  let grandTotal = $derived(isTaxInclusive ? afterDiscount : afterDiscount + taxAmount);

  let finalTotal = $derived(Math.round((grandTotal + roundOff) * 100) / 100);

  let splitRemainder = $derived.by(() => {
    const used = (parseFloat(cashAmt) || 0)
              + (parseFloat(upiAmt) || 0)
              + (parseFloat(creditAmt) || 0);
    return Math.round((finalTotal - used) * 100) / 100;
  });

  let isCreditSale = $derived((parseFloat(creditAmt) || 0) > 0);

  let activeCreditAmount = $derived(isCreditSale ? (parseFloat(creditAmt) || 0) : 0);
  let activeAmountPaid = $derived(isCreditSale ? finalTotal - activeCreditAmount : finalTotal);

  let activeCreditStatus = $derived.by((): 'pending' | 'partial' | 'paid' => {
    if (!isCreditSale) return 'paid';
    if (activeAmountPaid >= finalTotal) return 'paid';
    if (activeAmountPaid > 0) return 'partial';
    return 'pending';
  });

  // Primary payment method (highest split amount wins, defaults to cash)
  let primaryMethod = $derived.by(() => {
    const cash = parseFloat(cashAmt) || 0;
    const upi = parseFloat(upiAmt) || 0;
    const credit = parseFloat(creditAmt) || 0;
    const max = Math.max(cash, upi, credit);
    if (max === 0) return "cash";
    if (max === credit) return "credit";
    if (max === upi) return "transfer";
    return "cash";
  });

  function formatPrice(val: number | string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.activeShop.currencyCode || 'USD',
    }).format(Number(val));
  }

  function addToCart(product: any) {
    const existing = cart.find(c => c.product.id === product.id);
    if (existing) {
      if (existing.qty < product.qty) existing.qty += 1;
    } else {
      cart.push({ product, qty: 1 });
    }
  }

  function updateQty(productId: string, delta: number) {
    const item = cart.find(c => c.product.id === productId);
    if (!item) return;
    const maxQty = item.product.qty;
    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter(c => c.product.id !== productId);
    } else if (item.qty > maxQty) {
      item.qty = maxQty;
    }
  }

  function autoRoundOff() {
    const rem = grandTotal % 1;
    if (rem === 0) { roundOff = 0; return; }
    roundOff = Math.round((rem >= 0.5 ? (1 - rem) : -rem) * 100) / 100;
  }

  function onCashInput(raw: string) {
    const credit = parseFloat(creditAmt) || 0;
    const upi = parseFloat(upiAmt) || 0;
    const maxCash = Math.max(0, finalTotal - credit - upi);
    const val = Math.min(Math.max(0, parseFloat(raw) || 0), maxCash);
    cashAmt = val > 0 ? String(val) : '';
  }

  function onUpiInput(raw: string) {
    const credit = parseFloat(creditAmt) || 0;
    const maxUpi = Math.max(0, finalTotal - credit);
    const val = Math.min(Math.max(0, parseFloat(raw) || 0), maxUpi);
    upiAmt = val > 0 ? String(val) : '';
    const maxCash = Math.max(0, finalTotal - credit - val);
    cashAmt = maxCash > 0 ? String(maxCash) : '';
  }

  function onCreditInput(raw: string) {
    const upi = parseFloat(upiAmt) || 0;
    const maxCr = Math.max(0, finalTotal - upi);
    const val = Math.min(Math.max(0, parseFloat(raw) || 0), maxCr);
    creditAmt = val > 0 ? String(val) : '';
    const maxCash = Math.max(0, finalTotal - upi - val);
    cashAmt = maxCash > 0 ? String(maxCash) : '';
  }

  function buildPaymentSplits() {
    const splits: Array<{ method: string; amount: number }> = [];
    const cash = parseFloat(cashAmt) || 0;
    const upi = parseFloat(upiAmt) || 0;
    const credit = parseFloat(creditAmt) || 0;
    if (cash > 0) splits.push({ method: "cash", amount: cash });
    if (upi > 0) splits.push({ method: "transfer", amount: upi });
    if (credit > 0) splits.push({ method: "credit", amount: credit });
    return splits.length > 0 ? splits : null;
  }

  async function handleCheckout(paymentMethod: string) {
    if (cart.length === 0 || isProcessing) return;
    if (isCreditSale && !customerId) {
      toast.error("Pick a customer for credit/pay-later sales first.");
      return;
    }
    isProcessing = true;
    try {
      const resp = await data.client.transactions.$post({
        json: {
          shopId: data.activeShop.id,
          customerId: customerId || undefined,
          totalAmount: finalTotal.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          discountType: discountStr ? discountType : undefined,
          discountValue: discountStr ? discountStr.replace("%", "") : undefined,
          discountAmount: discountAmount.toFixed(2),
          roundOff: roundOff.toFixed(2),
          paymentMethod,
          paymentSplits: buildPaymentSplits(),
          creditStatus: isCreditSale ? activeCreditStatus : undefined,
          creditAmountPaid: isCreditSale ? activeAmountPaid.toFixed(2) : undefined,
          items: cart.map(c => ({
            productId: c.product.id,
            productName: c.product.name,
            qty: c.qty,
            unitPrice: Number(c.product.price).toFixed(2),
            subtotal: (Number(c.product.price) * c.qty).toFixed(2),
          }))
        }
      });
      if (resp.ok) {
        toast.success(`Sale recorded — ${data.activeShop?.currencySymbol ?? '$'}${finalTotal.toFixed(2)}`);
        // Deduct inventory locally instead of reloading
        cart.forEach((c: any) => {
          const p = data.products.find((pp: any) => pp.id === c.product.id);
          if (p) p.qty = Math.max(0, p.qty - c.qty);
        });
        cart = [];
        discountStr = "";
        roundOff = 0;
        cashAmt = "";
        upiAmt = "";
        creditAmt = "";
        customerId = null;
        customerName = "";
      } else {
        toast.error("Failed to process transaction.");
      }
    } catch (e: any) {
      toast.error("Network error: " + e.message);
    } finally {
      isProcessing = false;
    }
  }
</script>

<svelte:head>
  <title>Point of Sale | shëlf</title>
</svelte:head>

<div class="mx-auto w-full max-w-7xl h-full flex flex-col md:flex-row gap-6 overflow-hidden p-6 md:p-8 animate-fade-in">
  
  <!-- LEFT PANEL: Catalog -->
  <div class="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-background">
    
    <!-- Page Title -->
    <div class="shrink-0 mb-4">
      <h2 class="display-lg text-foreground tracking-tight">Point of Sale</h2>
      <p class="text-[13px] text-muted-foreground leading-none mt-1">Ring up sales and manage transactions.</p>
    </div>

    <!-- Top Action Bar -->
    <div class="flex items-center gap-3 mb-4 shrink-0">
      <div class="relative flex-1 group">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
        <Input 
          placeholder="Search items by name, barcode, or SKU..." 
          bind:value={searchQuery}
          class="pl-10 h-10 surface-card border-border/50 rounded-lg shadow-sm focus-visible:ring-primary/20 transition-all font-medium text-[13px]"
        />
      </div>
      {#if searchQuery}
        <button class="h-10 px-4 rounded-lg bg-card border border-border/50 hover:bg-muted font-bold text-[12px] uppercase tracking-wider transition-all text-muted-foreground" onclick={() => searchQuery = ''}>
          Clear
        </button>
      {/if}
    </div>

    <!-- Category Pills -->
    <div class="flex gap-2 mb-4 overflow-x-auto pb-1 shrink-0">
      <button
        class="whitespace-nowrap px-4 py-1.5 rounded-full font-bold text-[11px] uppercase tracking-wider transition-all border {selectedCategoryId === null ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground border-border/40 hover:border-foreground/30 hover:text-foreground'}"
        onclick={() => selectedCategoryId = null}
      >
        All Products
      </button>
      {#each data.categories as cat}
        <button
          class="whitespace-nowrap px-4 py-1.5 rounded-full font-bold text-[11px] uppercase tracking-wider transition-all border {selectedCategoryId === cat.id ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground border-border/40 hover:border-foreground/30 hover:text-foreground'}"
          onclick={() => selectedCategoryId = cat.id}
        >
          {cat.name}
        </button>
      {/each}
    </div>

    <!-- Products Grid -->
    <div class="flex-1 overflow-y-auto pr-1 pb-16">
      {#if filteredProducts.length === 0}
        <div class="flex flex-col items-center justify-center h-48 text-muted-foreground surface-card rounded-xl border border-dashed border-border/60">
          <ShoppingCart size={32} class="mb-4 opacity-20" />
          <p class="text-[13px] font-semibold">No products match your criteria.</p>
        </div>
      {:else}
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-max">
          {#each filteredProducts as product (product.id)}
            {@const cat = data.categories.find((c: any) => c.id === product.categoryId)}
            {@const catColor = cat?.color || 'hsl(210 5% 46%)'}
            {@const isLow = product.qty > 0 && product.qty <= 5}
            {@const isOut = product.qty === 0}
            <button 
              class="flex flex-col surface-card border border-border/40 hover:border-primary/40 rounded-xl p-4 text-left transition-all duration-200 active:scale-[0.97] hover:shadow-lg group relative overflow-hidden"
              onclick={() => addToCart(product)}
            >
              <!-- Hover glow -->
              <div class="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/[0.03] group-hover:to-primary/[0.06] transition-all duration-300 pointer-events-none"></div>
              
              <!-- Category color strip -->
              <div class="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style="background: {catColor}40"></div>

              <!-- Name -->
              <span class="font-bold text-[13px] leading-snug text-foreground line-clamp-2 mb-1 relative z-10">{product.name}</span>
              
              {#if product.sku}
                <span class="text-[9px] font-mono text-muted-foreground/60 mb-auto relative z-10">{product.sku}</span>
              {:else}
                <div class="mb-auto"></div>
              {/if}

              <!-- Bottom row: stock + price -->
              <div class="w-full flex justify-between items-end mt-2 relative z-10">
                <span class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded {isOut ? 'text-destructive bg-destructive/10' : isLow ? 'text-amber-500 bg-amber-500/10' : 'text-muted-foreground/70'}">
                  {product.qty} {product.unit}
                </span>
                <span class="font-extrabold tabular-nums text-[15px] text-foreground leading-none">{formatPrice(product.price)}</span>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- RIGHT PANEL: Cart & Checkout -->
  <div class="w-full md:w-[360px] xl:w-[400px] surface-card rounded-xl shadow-sm flex flex-col h-full max-h-full min-h-0 shrink-0 border border-border/40 overflow-hidden">
    
    <!-- Cart Header -->
    <div class="px-4 py-3 border-b border-border/40 bg-card/60 flex justify-between items-center shrink-0">
      <h2 class="text-[12px] font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
        <ShoppingCart size={14} class="text-primary" />
        Current Order {#if cart.length > 0}<span class="text-muted-foreground font-mono">({cart.length})</span>{/if}
      </h2>
      {#if cart.length > 0}
        <button class="h-6 text-[10px] uppercase font-bold tracking-wider px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors" onclick={() => { cart = []; discountStr = ''; roundOff = 0; cashAmt = ''; upiAmt = ''; creditAmt = ''; }}>
          Clear
        </button>
      {/if}
    </div>

    <!-- Cart Items -->
    <div class="flex-1 p-2 overflow-y-auto bg-background/50 min-h-0">
      <div class="space-y-1.5">
        {#each cart as item (item.product.id)}
          <div class="flex items-center gap-3 bg-card border border-border/40 rounded-lg p-2.5 shadow-sm hover:border-border/80 transition-colors">
            <div class="flex-1 min-w-0 flex flex-col">
              <p class="font-bold text-[12px] text-foreground truncate leading-tight">{item.product.name}</p>
              <p class="text-[10.5px] text-muted-foreground tabular font-semibold mt-0.5">
                {formatPrice(item.product.price)} <span class="text-[9px] uppercase">/ {item.product.unit}</span>
              </p>
            </div>
            <div class="flex items-center gap-1 shrink-0 bg-muted/40 rounded-md border border-border/50 p-0.5">
              <button 
                class="flex items-center justify-center h-6 w-6 rounded-sm bg-background shadow-sm hover:bg-destructive hover:text-destructive-foreground transition-colors text-muted-foreground border border-border/50"
                onclick={() => updateQty(item.product.id, -1)}
              >
                {#if item.qty === 1}
                  <Trash2 size={11} strokeWidth={2.5} />
                {:else}
                  <Minus size={11} strokeWidth={2.5} />
                {/if}
              </button>
              <span class="w-6 text-center tabular text-[12px] font-extrabold select-none">{item.qty}</span>
              <button 
                class="flex items-center justify-center h-6 w-6 rounded-sm bg-background shadow-sm hover:bg-primary hover:text-primary-foreground transition-colors text-muted-foreground border border-border/50 disabled:opacity-50"
                onclick={() => updateQty(item.product.id, 1)}
                disabled={item.qty >= item.product.qty}
              >
                <Plus size={11} strokeWidth={2.5} />
              </button>
            </div>
            <div class="text-right shrink-0 w-[60px]">
              <p class="font-extrabold text-[13px] text-foreground tabular underline decoration-border/50 underline-offset-4">{formatPrice(Number(item.product.price) * item.qty)}</p>
            </div>
          </div>
        {/each}
        
        {#if cart.length === 0}
          <div class="h-32 flex flex-col items-center justify-center text-muted-foreground space-y-2">
            <ShoppingCart size={24} class="opacity-20" />
            <span class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Cart is empty</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Checkout Footer -->
    <div class="p-4 bg-card border-t border-border/40 shrink-0 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.1)] z-10 overflow-y-auto max-h-[55%]">
      
      <!-- Customer Picker -->
      <div class="mb-3">
        <div class="relative">
          <button
            type="button"
            class="w-full h-8 px-3 rounded-lg border border-border/50 bg-background text-left flex items-center justify-between text-[11px] font-semibold transition-colors hover:border-border/80"
            onclick={() => (showCustPicker = !showCustPicker)}
          >
            <span class="flex items-center gap-1.5 {customerName ? 'text-foreground' : 'text-muted-foreground'}">
              <User size={11} />
              {customerName || 'Walk-in (no customer)'}
            </span>
            <ChevronDown size={11} />
          </button>
          {#if showCustPicker}
            <div class="absolute top-full left-0 right-0 mt-1 surface-card border border-border/60 rounded-lg z-20 max-h-40 overflow-y-auto shadow-lg">
              <button
                class="w-full text-left px-3 py-2 text-[11px] hover:bg-muted border-b border-border/30 font-semibold text-muted-foreground"
                onclick={() => { customerId = null; customerName = ''; showCustPicker = false; }}
              >
                Walk-in (no customer)
              </button>
              <input
                type="text"
                class="w-full px-3 py-1.5 text-[11px] border-b border-border/30 bg-background outline-none"
                placeholder="Search customer..."
                value={customerSearch}
                oninput={(e) => (customerSearch = (e.target as HTMLInputElement).value)}
              />
              {#each filteredCustomers as c}
                <button
                  class="w-full text-left px-3 py-2 text-[11px] hover:bg-muted border-b border-border/30 flex justify-between"
                  onclick={() => { customerId = c.id; customerName = c.name; customerSearch = ''; showCustPicker = false; }}
                >
                  <span class="truncate font-semibold">{c.name}</span>
                  {#if c.phone}<span class="text-muted-foreground">{c.phone}</span>{/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Discount + Round-off -->
      {#if cart.length > 0}
        <div class="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Discount</label>
            <input
              bind:value={discountStr}
              placeholder="500 or 10%"
              class="w-full h-8 px-2.5 rounded-lg border border-border/50 bg-background text-[12px] font-semibold tabular outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div>
            <label class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Round-off</label>
            <div class="flex gap-1">
              <input
                type="number"
                step="0.01"
                class="flex-1 h-8 px-2.5 rounded-lg border border-border/50 bg-background text-[12px] font-semibold tabular outline-none focus:border-primary/50 transition-colors"
                placeholder="0"
                value={roundOff || ''}
                oninput={(e) => { roundOff = parseFloat((e.target as HTMLInputElement).value) || 0; }}
              />
              <button
                type="button"
                class="h-8 px-2 rounded-lg bg-muted border border-border/50 text-[10px] font-bold uppercase tracking-wider hover:bg-muted/80 transition-colors shrink-0"
                onclick={autoRoundOff}
                title="Round to nearest whole"
              >
                Auto
              </button>
            </div>
          </div>
        </div>
      {/if}

      <!-- Split Payment Inputs -->
      {#if cart.length > 0}
        <div class="rounded-lg p-2.5 space-y-2 bg-muted/30 border border-border/30 mb-3">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold uppercase tracking-wider w-12 shrink-0 flex items-center gap-1 text-muted-foreground">
              <Banknote size={10} /> Cash
            </span>
            <input
              type="number" step="0.01" min="0"
              class="flex-1 h-7 px-2 rounded border border-border/50 bg-background text-[12px] font-semibold tabular outline-none focus:border-primary/50 transition-colors"
              placeholder="0"
              value={cashAmt}
              oninput={(e) => onCashInput((e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold uppercase tracking-wider w-12 shrink-0 flex items-center gap-1 text-muted-foreground">
              <ArrowLeftRight size={10} /> UPI
            </span>
            <input
              type="number" step="0.01" min="0"
              class="flex-1 h-7 px-2 rounded border border-border/50 bg-background text-[12px] font-semibold tabular outline-none focus:border-primary/50 transition-colors"
              placeholder="0"
              value={upiAmt}
              oninput={(e) => onUpiInput((e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold uppercase tracking-wider w-12 shrink-0 flex items-center gap-1 text-muted-foreground">
              <Clock size={10} /> Later
            </span>
            <input
              type="number" step="0.01" min="0"
              class="flex-1 h-7 px-2 rounded border border-border/50 bg-background text-[12px] font-semibold tabular outline-none focus:border-primary/50 transition-colors"
              placeholder="0"
              value={creditAmt}
              oninput={(e) => onCreditInput((e.target as HTMLInputElement).value)}
            />
          </div>
          {#if splitRemainder !== 0}
            <div class="pt-1.5 border-t border-border/30">
              <span class="text-[10px] font-bold {splitRemainder > 0 ? 'text-destructive' : 'text-emerald-500'}">
                {splitRemainder > 0 ? `Remaining ${formatPrice(splitRemainder)}` : `Over by ${formatPrice(Math.abs(splitRemainder))}`}
              </span>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Credit info banner -->
      {#if isCreditSale}
        <div class="rounded-lg p-2.5 mb-3 border border-amber-500/20 bg-amber-500/5">
          <span class="text-[10px] font-bold text-amber-600 dark:text-amber-400">
            {activeCreditStatus === 'paid' ? 'Paid in full'
              : activeCreditStatus === 'partial' ? `Partial · ${formatPrice(activeCreditAmount)} on credit`
              : `Pending · ${formatPrice(finalTotal)} due`}
          </span>
          {#if customerId}
            <span class="text-muted-foreground ml-1">· {customerName}</span>
          {:else}
            <span class="text-destructive ml-1 font-bold">· pick a customer</span>
          {/if}
        </div>
      {/if}

      <!-- Receipt Math -->
      <div class="space-y-1.5 mb-3 px-1">
        <div class="flex justify-between text-[11px] font-bold uppercase tracking-wider">
          <span class="text-muted-foreground">Subtotal</span>
          <span class="tabular text-foreground">{formatPrice(cartSubtotal)}</span>
        </div>
        {#if discountAmount > 0}
          <div class="flex justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <span>Discount {discountStr.includes('%') ? `(${discountStr})` : ''}</span>
            <span class="tabular">– {formatPrice(discountAmount)}</span>
          </div>
        {/if}
        {#if taxRatePercent > 0}
          <div class="flex justify-between text-[11px] font-bold uppercase tracking-wider">
            <span class="text-muted-foreground">{data.activeShop.taxName || 'Tax'} <span class="opacity-60 font-mono">({taxRatePercent}%)</span></span>
            <span class="tabular text-foreground">{formatPrice(taxAmount)}</span>
          </div>
        {/if}
        {#if roundOff !== 0}
          <div class="flex justify-between text-[11px] font-bold uppercase tracking-wider">
            <span class="text-muted-foreground">Round-off</span>
            <span class="tabular text-foreground">{roundOff > 0 ? '+' : ''}{formatPrice(roundOff)}</span>
          </div>
        {/if}
        <div class="h-px bg-border/60 my-2"></div>
        <div class="flex justify-between items-end text-foreground pt-0.5">
          <span class="text-[13px] font-extrabold uppercase tracking-widest leading-none mb-1">Total</span>
          <span class="text-primary tabular text-[26px] font-black leading-none tracking-tight">{formatPrice(finalTotal)}</span>
        </div>
      </div>

      <!-- Single Checkout Button -->
      <button
        class="w-full h-12 rounded-lg font-extrabold text-[13px] uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed {isCreditSale ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}"
        disabled={cart.length === 0 || isProcessing || (isCreditSale && !customerId)}
        onclick={() => handleCheckout(primaryMethod)}
      >
        {#if isProcessing}
          Processing...
        {:else if isCreditSale}
          Record Credit Sale — {formatPrice(finalTotal)}
        {:else}
          Pay {formatPrice(finalTotal)}
        {/if}
      </button>
    </div>
  </div>
</div>
