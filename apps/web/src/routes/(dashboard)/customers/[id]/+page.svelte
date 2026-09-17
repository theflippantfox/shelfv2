<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { toast } from "$lib/utils/toast";
  import {
    ArrowLeft, Phone, Mail, Calendar, CreditCard,
    ShoppingBag, Pencil, Trash2, Loader2, Clock, IndianRupee
  } from "lucide-svelte";

  let { data }: { data: any } = $props();

  let showEditDialog = $state(false);
  let formName = $state(data.customer?.name || "");
  let formPhone = $state(data.customer?.phone || "");
  let formEmail = $state(data.customer?.email || "");
  let formNotes = $state(data.customer?.notes || "");
  let isSaving = $state(false);

  let customer = $derived(data.customer);
  const transactions = $derived(data.transactions as any[]);

  // KPIs
  const totalSpent = $derived(parseFloat(customer?.totalSpent || "0"));
  const outstanding = $derived(parseFloat(customer?.outstandingBalance || "0"));
  const completedTx = $derived(transactions.filter((t: any) => t.status === "completed"));
  const creditTx = $derived(transactions.filter((t: any) => t.paymentMethod === "credit" && t.status === "completed"));

  function getTier(spend: number, visits: number): { label: string; class: string; icon: string } {
    if (spend >= 10000 || visits >= 10) return { label: "VIP", class: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: "★" };
    if (spend >= 3000 || visits >= 3) return { label: "Regular", class: "bg-primary/10 text-primary border-primary/20", icon: "●" };
    return { label: "New", class: "bg-muted text-muted-foreground border-border/50", icon: "○" };
  }

  function formatDate(dateStr: string): string {
    const locale = data.activeShop?.currencyLocale ?? "en-US";
    return new Intl.DateTimeFormat(locale, {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(dateStr));
  }

  function formatCompact(val: number): string {
    const symbol = data.activeShop?.currencySymbol ?? "$";
    if (val >= 100000) return `${symbol}${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `${symbol}${(val / 1000).toFixed(1)}K`;
    return `${val.toLocaleString(data.activeShop?.currencyLocale ?? "en-US", { maximumFractionDigits: 0 })}`;
  }

  function formatPrice(val: number | string): string {
    const locale = data.activeShop?.currencyLocale ?? "en-US";
    const currency = data.activeShop?.currencyCode ?? "USD";
    return new Intl.NumberFormat(locale, {
      style: "currency", currency,
    }).format(Number(val));
  }

  async function handleUpdate(e: Event) {
    e.preventDefault();
    if (!formName.trim()) return;
    isSaving = true;
    try {
      const resp = await data.client.customers[":id"].$patch({
        param: { id: customer.id },
        json: { name: formName.trim(), phone: formPhone.trim() || null, email: formEmail.trim() || null, notes: formNotes.trim() || null },
      });
      if (resp.ok) {
        toast.success("Customer updated!");
        customer = { ...customer, name: formName.trim(), phone: formPhone.trim() || null, email: formEmail.trim() || null, notes: formNotes.trim() || null };
        showEditDialog = false;
      } else {
        toast.error("Failed to update customer.");
      }
    } catch (e: any) {
      toast.error("Network error: " + e.message);
    } finally {
      isSaving = false;
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${customer.name}? This cannot be undone.`)) return;
    const resp = await data.client.customers[":id"].$delete({ param: { id: customer.id } });
    if (resp.ok) {
      toast.success("Customer deleted.");
      window.location.href = "/customers";
    } else {
      toast.error("Failed to delete customer.");
    }
  }

  function getInitials(name: string): string {
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  }

  function getMethodColor(method: string): string {
    if (method === "cash") return "bg-emerald-500/10 text-emerald-500";
    if (method === "credit") return "bg-amber-500/10 text-amber-500";
    return "bg-[hsl(222,100%,59%)]/10 text-[hsl(222,100%,59%)]";
  }

  function getStatusChip(status: string) {
    if (status === "completed") return { label: "Completed", cls: "bg-emerald-500/10 text-emerald-500" };
    if (status === "voided") return { label: "Voided", cls: "bg-destructive/10 text-destructive" };
    return { label: status, cls: "bg-muted text-muted-foreground" };
  }
</script>

<svelte:head>
  <title>{customer?.name || "Customer"} · shëlf</title>
</svelte:head>

{#if !customer}
  <div class="flex flex-col items-center justify-center h-full text-muted-foreground">
    <p class="text-[14px] font-bold">Customer not found</p>
    <a href="/customers" class="text-[12px] text-primary mt-2 font-bold hover:underline">Back to Customers</a>
  </div>
{:else}
  {@const tier = getTier(totalSpent, customer.visitCount)}

  <div class="flex flex-col h-full max-h-full gap-4 overflow-y-auto">
    <!-- Back button -->
    <div class="shrink-0">
      <a href="/customers" class="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={14} /> All Customers
      </a>
    </div>

    <!-- Profile Header -->
    <div class="shrink-0 surface-card rounded-xl p-6">
      <div class="flex items-start gap-5">
        <!-- Avatar -->
        <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <span class="text-xl font-bold text-primary">{getInitials(customer.name)}</span>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-3 flex-wrap">
            <h1 class="display-sm text-foreground">{customer.name}</h1>
            <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold border {tier.class}">
              {tier.icon} {tier.label}
            </span>
          </div>
          <div class="flex items-center gap-4 mt-2 text-[12px] text-muted-foreground flex-wrap">
            {#if customer.phone}
              <span class="flex items-center gap-1.5"><Phone size={12} /> {customer.phone}</span>
            {/if}
            {#if customer.email}
              <span class="flex items-center gap-1.5"><Mail size={12} /> {customer.email}</span>
            {/if}
            <span class="flex items-center gap-1.5"><Calendar size={12} /> Joined {formatDate(customer.createdAt)}</span>
          </div>
          {#if customer.notes}
            <p class="mt-2 text-[12px] text-muted-foreground italic">{customer.notes}</p>
          {/if}
        </div>

        <!-- Actions -->
        <div class="flex gap-2 shrink-0">
          <Button variant="outline" class="h-8 px-3 text-[11px] font-bold gap-1.5" onclick={() => { formName = customer.name; formPhone = customer.phone || ""; formEmail = customer.email || ""; formNotes = customer.notes || ""; showEditDialog = true; }}>
            <Pencil size={12} /> Edit
          </Button>
          <Button variant="outline" class="h-8 px-3 text-[11px] font-bold gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20" onclick={handleDelete}>
            <Trash2 size={12} /> Delete
          </Button>
        </div>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="surface-card rounded-xl p-4">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
            <IndianRupee size={13} class="text-primary" />
          </div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Spent</span>
        </div>
        <p class="text-[20px] font-black tabular-nums leading-none text-foreground">{formatCompact(totalSpent)}</p>
      </div>
      <div class="surface-card rounded-xl p-4">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-7 h-7 rounded-md bg-[hsl(222,100%,59%)]/10 flex items-center justify-center">
            <ShoppingBag size={13} class="text-[hsl(222,100%,59%)]" />
          </div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Visits</span>
        </div>
        <p class="text-[20px] font-black tabular-nums leading-none text-foreground">{customer.visitCount}</p>
      </div>
      <div class="surface-card rounded-xl p-4">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-7 h-7 rounded-md {outstanding > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'} flex items-center justify-center">
            <CreditCard size={13} class="{outstanding > 0 ? 'text-amber-500' : 'text-emerald-500'}" />
          </div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Outstanding</span>
        </div>
        <p class="text-[20px] font-black tabular-nums leading-none {outstanding > 0 ? 'text-amber-500' : 'text-foreground'}">{formatCompact(outstanding)}</p>
      </div>
      <div class="surface-card rounded-xl p-4">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-7 h-7 rounded-md bg-secondary flex items-center justify-center">
            <Clock size={13} class="text-muted-foreground" />
          </div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Visit</span>
        </div>
        <p class="text-[13px] font-bold text-foreground">
          {customer.lastVisit ? formatDate(customer.lastVisit) : "Never"}
        </p>
      </div>
    </div>

    <!-- Purchase History -->
    <div class="flex-1 min-h-0 surface-card rounded-xl overflow-hidden">
      <div class="px-4 py-3 border-b border-border/30 bg-card/40 flex justify-between items-center">
        <h3 class="text-[11.5px] font-bold uppercase tracking-wider text-foreground">Purchase History</h3>
        <span class="text-[10px] text-muted-foreground font-bold">{completedTx.length} transaction{completedTx.length !== 1 ? 's' : ''}</span>
      </div>

      {#if completedTx.length === 0}
        <div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ShoppingBag size={28} class="mb-3 opacity-20" />
          <p class="text-[13px] font-semibold">No purchases yet</p>
          <p class="text-[11px] mt-1">This customer hasn't made any purchases.</p>
        </div>
      {:else}
        <div class="overflow-y-auto max-h-[400px]">
          {#each completedTx as tx (tx.id)}
            {@const chip = getStatusChip(tx.status)}
            {@const creditStatus = tx.paymentMethod === "credit" ? (tx.creditStatus || "pending") : null}
            <div class="flex items-center gap-3 px-4 py-3 border-b border-border/10 last:border-0 hover:bg-muted/10 transition-colors">
              <!-- Method icon -->
              <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 {getMethodColor(tx.paymentMethod)}">
                {#if tx.paymentMethod === "cash"}
                  <span class="text-[10px] font-bold">{data.activeShop?.currencySymbol ?? '$'}</span>
                {:else if tx.paymentMethod === "credit"}
                  <Clock size={14} />
                {:else}
                  <span class="text-[10px] font-bold">↗</span>
                {/if}
              </div>
              <!-- Details -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-mono text-[11px] font-bold text-primary">{tx.receiptId}</span>
                  <span class="text-[9px] font-bold px-1.5 py-0.5 rounded {chip.cls}">{chip.label}</span>
                  {#if creditStatus}
                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded
                      {creditStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                       creditStatus === 'partial' ? 'bg-amber-500/10 text-amber-500' :
                       'bg-destructive/10 text-destructive'}">
                      Credit: {creditStatus}
                    </span>
                  {/if}
                </div>
                <p class="text-[10px] text-muted-foreground mt-0.5">{formatDate(tx.createdAt)}</p>
              </div>
              <!-- Amount -->
              <div class="text-right shrink-0">
                <p class="text-[14px] font-bold tabular-nums {tx.status === 'voided' ? 'line-through text-muted-foreground' : 'text-foreground'}">
                  {formatPrice(tx.totalAmount)}
                </p>
                <p class="text-[10px] text-muted-foreground">{tx.items?.length ?? 0} item{(tx.items?.length ?? 0) === 1 ? '' : 's'}</p>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Edit Dialog -->
  {#if showEditDialog}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="w-full max-w-md rounded-xl border border-border/50 bg-background p-6 shadow-2xl animate-scale-in">
        <h2 class="text-[15px] font-bold text-foreground mb-4">Edit Customer</h2>
        <form onsubmit={handleUpdate} class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
            <input bind:value={formName} required class="w-full h-10 rounded-lg bg-muted/20 border border-border/50 px-3 text-[13px] font-medium outline-none focus:border-primary/50 transition-colors" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Phone</label>
              <input bind:value={formPhone} type="tel" class="w-full h-10 rounded-lg bg-muted/20 border border-border/50 px-3 text-[13px] font-medium outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div class="space-y-1.5">
              <label class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email</label>
              <input bind:value={formEmail} type="email" class="w-full h-10 rounded-lg bg-muted/20 border border-border/50 px-3 text-[13px] font-medium outline-none focus:border-primary/50 transition-colors" />
            </div>
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Notes</label>
            <textarea bind:value={formNotes} rows="2" class="w-full rounded-lg bg-muted/20 border border-border/50 px-3 py-2 text-[13px] font-medium outline-none focus:border-primary/50 transition-colors resize-none"></textarea>
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onclick={() => (showEditDialog = false)} disabled={isSaving} class="h-9 px-4 rounded-lg text-[12px] font-bold">Cancel</Button>
            <Button type="submit" disabled={isSaving || !formName.trim()} class="h-9 px-5 rounded-lg text-[12px] font-bold">
              {#if isSaving}<Loader2 class="mr-2 h-3.5 w-3.5 animate-spin" />{/if}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  {/if}
{/if}
