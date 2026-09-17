<script lang="ts">
  import { toast } from "$lib/utils/toast";
  import {
    ArrowLeft, RotateCcw,
    Calendar, CreditCard, Banknote, ArrowLeftRight,
    X
  } from "lucide-svelte";

  let { data }: { data: any } = $props();
  const tx = $derived(data.transaction);
  const items = $derived(data.items ?? []);

  const currencySymbol = $derived(data.activeShop?.currencySymbol ?? "$");
  const currencyLocale = $derived(data.activeShop?.currencyLocale ?? "en-US");

  function fmtPrice(val: number | string): string {
    return `${currencySymbol}${parseFloat(String(val)).toFixed(2)}`;
  }

  // ── Return sheet state ──────────────────────────────────────
  let showReturn = $state(false);
  let saving = $state(false);
  let returnReason = $state("changed_mind");
  let returnMethod = $state("cash");
  let returnNotes = $state("");
  let returnLines: Record<string, { qty: number; condition: string }> = $state({});
  let returnIncluded: Record<string, boolean> = $state({});

  const REASONS = [
    { value: "changed_mind", label: "Customer changed mind" },
    { value: "defective", label: "Defective product" },
    { value: "wrong_item", label: "Wrong item delivered" },
    { value: "overcharge", label: "Overcharged" },
    { value: "other", label: "Other" },
  ];
  const METHODS = [
    { value: "cash", label: "Cash refund" },
    { value: "upi", label: "UPI / Transfer" },
    { value: "credit_note", label: "Store credit" },
    { value: "none", label: "No refund" },
  ];

  // Initialize return lines when sheet opens
  function openReturn() {
    showReturn = true;
    for (const item of items) {
      returnLines[item.id] = { qty: 0, condition: "resellable" };
      returnIncluded[item.id] = false;
    }
  }

  const refundTotal = $derived.by(() => {
    let total = 0;
    for (const item of items) {
      if (returnIncluded[item.id]) {
        const line = returnLines[item.id];
        const qty = line?.qty ?? 0;
        total += qty * parseFloat(item.unitPrice);
      }
    }
    return total;
  });

  async function submitReturn() {
    if (refundTotal === 0) { toast.error("Select at least one item to return."); return; }
    saving = true;
    try {
      const payload = {
        shopId: tx.shopId,
        transactionId: tx.id,
        customerId: tx.customerId ?? null,
        reason: returnReason,
        method: returnMethod,
        refundAmount: String(refundTotal),
        notes: returnNotes || null,
        items: items
          .filter((item: any) => returnIncluded[item.id])
          .map((item: any) => ({
            transactionItemId: item.id,
            productId: item.productId,
            productName: item.productName,
            qty: returnLines[item.id]?.qty ?? 0,
            unitPrice: item.unitPrice,
            subtotal: String((returnLines[item.id]?.qty ?? 0) * parseFloat(item.unitPrice)),
            condition: returnLines[item.id]?.condition ?? "resellable",
          })),
      };

      const resp = await data.client.returns.$post({ json: payload });
      if (resp.ok) {
        toast.success(`Return processed — ${fmtPrice(refundTotal)} refund`);
        showReturn = false;
      } else {
        toast.error("Failed to process return.");
      }
    } catch {
      toast.error("Failed to process return.");
    } finally {
      saving = false;
    }
  }



  function getPaymentLabel(method: string) {
    if (method === "cash") return "Cash";
    if (method === "transfer") return "UPI / Transfer";
    if (method === "credit") return "On Credit";
    return method;
  }

  function getStatusColor(status: string) {
    if (status === "completed") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (status === "refunded") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-muted text-muted-foreground border-border/50";
  }

  function getCreditColor(status: string | null) {
    if (status === "paid") return "bg-emerald-500/10 text-emerald-600";
    if (status === "partial") return "bg-amber-500/10 text-amber-600";
    if (status === "pending") return "bg-rose-500/10 text-rose-600";
    return "";
  }
</script>

<div class="h-full max-h-full overflow-y-auto">
  <div class="max-w-2xl mx-auto space-y-6 animate-fade-in">
    <!-- Back -->
    <a href="/transactions" class="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors">
      <ArrowLeft size={13} /> Transactions
    </a>

    {#if !tx}
      <div class="text-center py-20 text-muted-foreground">
        <p class="text-[14px] font-semibold">Transaction not found</p>
      </div>
    {:else}
      <!-- Header -->
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-3 mb-1">
            <h1 class="text-[20px] font-bold text-foreground tracking-tight">{tx.receiptId}</h1>
            <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold {getStatusColor(tx.status)} capitalize">
              {tx.status}
            </span>
          </div>
          <p class="text-[12px] text-muted-foreground flex items-center gap-1.5">
            <Calendar size={12} />
            {new Date(tx.createdAt).toLocaleString(currencyLocale, { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <div class="flex gap-2">
          <button onclick={() => openReturn()} class="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/50 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
            <RotateCcw size={13} /> Return
          </button>
        </div>
      </div>

      <!-- Summary cards -->
      <div class="grid grid-cols-3 gap-3">
        <div class="rounded-xl border border-border/40 p-4 text-center">
          <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Total</p>
          <p class="text-[18px] font-extrabold text-foreground">{fmtPrice(tx.totalAmount)}</p>
        </div>
        <div class="rounded-xl border border-border/40 p-4 text-center">
          <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Payment</p>
          <div class="flex items-center justify-center gap-1.5">
            {#if tx.paymentMethod === "cash"}
              <Banknote size={14} class="text-muted-foreground" />
            {:else if tx.paymentMethod === "transfer" || tx.paymentMethod === "upi"}
              <ArrowLeftRight size={14} class="text-muted-foreground" />
            {:else}
              <CreditCard size={14} class="text-muted-foreground" />
            {/if}
            <span class="text-[13px] font-bold text-foreground">{getPaymentLabel(tx.paymentMethod)}</span>
          </div>
        </div>
        <div class="rounded-xl border border-border/40 p-4 text-center">
          <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Items</p>
          <p class="text-[18px] font-extrabold text-foreground">{items.length}</p>
        </div>
      </div>

      <!-- Customer info -->
      {#if tx.customerName}
        <div class="rounded-xl border border-border/40 p-4 flex items-center justify-between">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Customer</p>
            <p class="text-[13px] font-bold text-foreground">{tx.customerName}</p>
          </div>
          {#if tx.creditStatus}
            <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold {getCreditColor(tx.creditStatus)} capitalize">
              {tx.creditStatus}
            </span>
          {/if}
        </div>
      {/if}

      <!-- Discount & round-off -->
      {#if parseFloat(tx.discountAmount) > 0 || parseFloat(tx.roundOff || "0") !== 0}
        <div class="rounded-xl border border-border/40 p-4 space-y-2 text-[12px]">
          {#if parseFloat(tx.discountAmount) > 0}
            <div class="flex justify-between">
              <span class="text-muted-foreground">Discount {tx.discountType === "percentage" ? `(${tx.discountValue}%)` : ""}</span>
              <span class="font-semibold text-rose-500">-{fmtPrice(tx.discountAmount)}</span>
            </div>
          {/if}
          {#if parseFloat(tx.roundOff || "0") !== 0}
            <div class="flex justify-between">
              <span class="text-muted-foreground">Round off</span>
              <span class="font-semibold text-foreground">{fmtPrice(tx.roundOff || "0")}</span>
            </div>
          {/if}
          {#if parseFloat(tx.taxAmount) > 0}
            <div class="flex justify-between">
              <span class="text-muted-foreground">Tax</span>
              <span class="font-semibold text-foreground">{fmtPrice(tx.taxAmount)}</span>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Items list -->
      <div class="rounded-xl border border-border/40 overflow-hidden">
        <div class="px-4 py-3 border-b border-border/30">
          <h3 class="text-[12px] font-bold text-foreground">Items</h3>
        </div>
        <div class="divide-y divide-border/30">
          {#each items as item (item.id)}
            <div class="px-4 py-3 flex items-center justify-between">
              <div class="flex-1 min-w-0">
                <p class="text-[13px] font-semibold text-foreground truncate">{item.productName}</p>
                <p class="text-[11px] text-muted-foreground mt-0.5">
                  {item.qty} × {fmtPrice(item.unitPrice)}
                </p>
              </div>
              <p class="text-[13px] font-bold text-foreground tabular-nums">{fmtPrice(item.subtotal)}</p>
            </div>
          {/each}
        </div>
        <!-- Total -->
        <div class="px-4 py-3 border-t border-border/30 bg-secondary/20 flex justify-between">
          <span class="text-[13px] font-bold text-foreground">Total</span>
          <span class="text-[14px] font-extrabold text-foreground">{fmtPrice(tx.totalAmount)}</span>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Return Sheet -->
{#if showReturn}
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onclick={() => (showReturn = false)} role="button" tabindex="-1" onkeydown={(e) => e.key === "Escape" && (showReturn = false)}></div>

    <!-- Sheet -->
    <div class="relative w-full sm:max-w-lg max-h-[85vh] bg-background border border-border/40 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-in-right sm:animate-scale-in flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-border/30 shrink-0">
        <div>
          <h2 class="text-[14px] font-bold text-foreground">Process Return</h2>
          <p class="text-[11px] text-muted-foreground">{tx?.receiptId}</p>
        </div>
        <button onclick={() => (showReturn = false)} class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary/60 transition-colors">
          <X size={16} class="text-muted-foreground" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-5 space-y-5">
        <!-- Reason -->
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Reason</p>
          <div class="grid grid-cols-1 gap-1.5">
            {#each REASONS as r}
              <label class="flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all {returnReason === r.value ? 'border-primary bg-primary/5' : 'border-border/40 hover:bg-secondary/30'}">
                <input type="radio" name="reason" value={r.value} bind:group={returnReason} class="w-3.5 h-3.5 rounded-full border-border/60 text-primary" />
                <span class="text-[12px] font-medium text-foreground">{r.label}</span>
              </label>
            {/each}
          </div>
        </div>

        <!-- Items -->
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Items to Return</p>
          <div class="space-y-2">
            {#each items as item (item.id)}
              {@const included = returnIncluded[item.id] ?? false}
              {@const line = returnLines[item.id]}
              <div class="rounded-lg border border-border/40 p-3 space-y-2 {included ? 'border-primary/50 bg-primary/5' : ''}">
                <div class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={included}
                    onchange={() => { returnIncluded[item.id] = !included; }}
                    class="w-4 h-4 rounded border-border/60 text-primary"
                  />
                  <div class="flex-1 min-w-0">
                    <p class="text-[12px] font-semibold text-foreground truncate">{item.productName}</p>
                    <p class="text-[10px] text-muted-foreground">Purchased: {item.qty} × {fmtPrice(item.unitPrice)}</p>
                  </div>
                </div>
                {#if included}
                  <div class="flex gap-2 pl-6">
                    <div class="flex-1">
                      <label class="text-[10px] text-muted-foreground mb-0.5 block">Qty</label>
                      <input
                        type="number"
                        min="1"
                        max={item.qty}
                        value={line?.qty ?? 1}
                        onchange={(e) => {
                          if (!returnLines[item.id]) returnLines[item.id] = { qty: 1, condition: "resellable" };
                          returnLines[item.id].qty = Math.min(parseInt((e.target as HTMLInputElement).value) || 1, item.qty);
                        }}
                        class="w-full h-8 rounded-lg bg-muted/20 border border-border/50 px-2 text-[12px] font-mono text-foreground outline-none focus:border-primary/50"
                      />
                    </div>
                    <div class="flex-1">
                      <label class="text-[10px] text-muted-foreground mb-0.5 block">Condition</label>
                      <select
                        onchange={(e) => {
                          if (!returnLines[item.id]) returnLines[item.id] = { qty: 1, condition: "resellable" };
                          returnLines[item.id].condition = (e.target as HTMLSelectElement).value;
                        }}
                        class="w-full h-8 rounded-lg bg-muted/20 border border-border/50 px-2 text-[12px] text-foreground outline-none focus:border-primary/50"
                      >
                        <option value="resellable">Resellable</option>
                        <option value="damaged">Damaged</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <!-- Refund method -->
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Refund Method</p>
          <div class="grid grid-cols-2 gap-1.5">
            {#each METHODS as m}
              <label class="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all {returnMethod === m.value ? 'border-primary bg-primary/5' : 'border-border/40 hover:bg-secondary/30'}">
                <input type="radio" name="method" value={m.value} bind:group={returnMethod} class="w-3.5 h-3.5 rounded-full border-border/60 text-primary" />
                <span class="text-[12px] font-medium text-foreground">{m.label}</span>
              </label>
            {/each}
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Notes (optional)</label>
          <textarea
            bind:value={returnNotes}
            rows="2"
            placeholder="Any additional notes..."
            class="w-full rounded-lg bg-muted/20 border border-border/50 px-3 py-2 text-[12px] font-medium outline-none focus:border-primary/50 transition-colors resize-none"
          ></textarea>
        </div>
      </div>

      <!-- Footer -->
      <div class="shrink-0 px-5 py-4 border-t border-border/30 bg-card flex items-center justify-between">
        <div>
          <p class="text-[11px] text-muted-foreground">Refund amount</p>
          <p class="text-[16px] font-extrabold text-foreground">{fmtPrice(refundTotal)}</p>
        </div>
        <button
          onclick={submitReturn}
          disabled={saving || refundTotal === 0}
          class="inline-flex items-center justify-center h-9 px-6 rounded-lg bg-primary text-primary-foreground text-[12px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {#if saving}
            <span class="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2"></span>
          {/if}
          Process Return
        </button>
      </div>
    </div>
  </div>
{/if}
