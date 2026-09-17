<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Users, Plus, Search, Pencil, Trash2, Loader2, Phone, Mail } from "lucide-svelte";
  import { toast } from "$lib/utils/toast";

  let { data }: { data: any } = $props();
  let customers = $state<any[]>(data.customers ?? []);

  let search = $state("");
  let showDialog = $state(false);
  let editingId = $state<string | null>(null);
  let formName = $state("");
  let formPhone = $state("");
  let formEmail = $state("");
  let formNotes = $state("");
  let isSaving = $state(false);
  let saveError = $state<string | null>(null);

  const filtered = $derived(
    search
      ? customers.filter((c: any) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.phone?.toLowerCase().includes(search.toLowerCase()) ||
          c.email?.toLowerCase().includes(search.toLowerCase())
        )
      : customers
  );

  // KPIs
  const totalCustomers = $derived(customers.length);
  const totalOutstanding = $derived(
    customers.reduce((sum: number, c: any) => sum + parseFloat(c.outstandingBalance || "0"), 0)
  );
  const totalSpent = $derived(
    customers.reduce((sum: number, c: any) => sum + parseFloat(c.totalSpent || "0"), 0)
  );

  function getInitials(name: string): string {
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  }

  function getTier(c: any): { label: string; class: string } {
    const spent = parseFloat(c.totalSpent || "0");
    const visits = c.visitCount || 0;
    if (spent >= 10000 || visits >= 10) return { label: "VIP", class: "bg-amber-500/10 text-amber-500" };
    if (spent >= 3000 || visits >= 3) return { label: "Regular", class: "bg-primary/10 text-primary" };
    return { label: "New", class: "bg-muted text-muted-foreground" };
  }

  function openCreate() {
    editingId = null; formName = ""; formPhone = ""; formEmail = ""; formNotes = ""; saveError = null; showDialog = true;
  }
  function openEdit(c: any) {
    editingId = c.id; formName = c.name; formPhone = c.phone || ""; formEmail = c.email || ""; formNotes = c.notes || ""; saveError = null; showDialog = true;
  }
  async function handleSave(e: Event) {
    e.preventDefault();
    if (!formName.trim()) return;
    isSaving = true; saveError = null;
    try {
      if (editingId) {
        const resp = await data.client.customers[":id"].$patch({
          param: { id: editingId },
          json: { name: formName.trim(), phone: formPhone.trim() || null, email: formEmail.trim() || null, notes: formNotes.trim() || null },
        });
        if (resp.ok) {
          customers = customers.map((x: any) => x.id === editingId ? { ...x, name: formName.trim(), phone: formPhone.trim() || null, email: formEmail.trim() || null, notes: formNotes.trim() || null } : x);
          toast.success("Customer updated!");
          showDialog = false;
        }
        else { const body = await resp.json(); saveError = (body as any).error || "Failed to update."; }
      } else {
        const resp = await data.client.customers.$post({
          json: { shopId: data.activeShop.id, name: formName.trim(), phone: formPhone.trim() || null, email: formEmail.trim() || null, notes: formNotes.trim() || null },
        });
        if (resp.ok) {
          const saved = await resp.json();
          const c = (saved as any).customer ?? (saved as any).data ?? saved;
          customers = [...customers, { id: c?.id ?? crypto.randomUUID(), name: formName.trim(), phone: formPhone.trim() || null, email: formEmail.trim() || null, notes: formNotes.trim() || null, totalSpent: "0", outstandingBalance: "0", totalVisits: 0 }];
          toast.success("Customer created!");
          showDialog = false;
        }
        else { const body = await resp.json(); saveError = (body as any).error || "Failed to create."; }
      }
    } catch (e: any) { saveError = e.message || "Network error."; }
    finally { isSaving = false; }
  }
  async function handleDelete(c: any) {
    if (!confirm(`Delete ${c.name}? This cannot be undone.`)) return;
    const resp = await data.client.customers[":id"].$delete({ param: { id: c.id } });
    if (resp.ok) { toast.success("Customer deleted."); window.location.href = "/customers"; }
  }
</script>

<svelte:head><title>Customers · shëlf</title></svelte:head>

<div class="flex flex-col h-full max-h-full gap-4">
  <!-- Header -->
  <div class="shrink-0 flex items-center justify-between">
    <div>
      <h1 class="display-lg text-foreground">Customers</h1>
      <p class="text-[11px] text-muted-foreground mt-1">{totalCustomers} customer{totalCustomers !== 1 ? 's' : ''} total</p>
    </div>
    <Button onclick={openCreate} class="h-9 px-4 rounded-lg text-[12px] font-bold gap-1.5">
      <Plus size={15} /> Add Customer
    </Button>
  </div>

  <!-- KPI Strip -->
  <div class="shrink-0 grid grid-cols-3 gap-3">
    <div class="surface-card rounded-xl p-3.5">
      <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Customers</p>
      <p class="text-xl font-bold text-foreground tabular-nums">{totalCustomers}</p>
    </div>
    <div class="surface-card rounded-xl p-3.5">
      <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Spent</p>
      <p class="text-xl font-bold text-foreground tabular-nums">{data.activeShop?.currencySymbol ?? '$'}{totalSpent.toLocaleString(data.activeShop?.currencyLocale ?? "en-US", { maximumFractionDigits: 0 })}</p>
    </div>
    <div class="surface-card rounded-xl p-3.5">
      <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Outstanding</p>
      <p class="text-xl font-bold {totalOutstanding > 0 ? 'text-amber-500' : 'text-foreground'} tabular-nums">
        {data.activeShop?.currencySymbol ?? '$'}{totalOutstanding.toLocaleString(data.activeShop?.currencyLocale ?? "en-US", { maximumFractionDigits: 0 })}
      </p>
    </div>
  </div>

  <!-- Search -->
  <div class="shrink-0 relative">
    <Search size={15} class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
    <input
      type="text"
      bind:value={search}
      placeholder="Search by name, phone, or email..."
      class="w-full h-9 pl-9 pr-4 rounded-lg bg-muted/30 border border-border/40 text-[12px] font-medium outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/40"
    />
  </div>

  <!-- Customer List -->
  <div class="flex-1 min-h-0 overflow-y-auto">
    {#if filtered.length === 0}
      <div class="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div class="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Users size={24} />
        </div>
        <p class="text-[14px] font-bold">{search ? 'No matching customers' : 'No customers yet'}</p>
        <p class="text-[11px] mt-1 mb-5">{search ? 'Try a different search term.' : 'Add your first customer to start tracking visits.'}</p>
        {#if !search}
          <Button onclick={openCreate} class="h-9 px-5 rounded-lg text-[12px] font-bold gap-1.5">
            <Plus size={15} /> Add Customer
          </Button>
        {/if}
      </div>
    {:else}
      <div class="space-y-2">
        {#each filtered as c (c.id)}
          {@const tier = getTier(c)}
          {@const outstanding = parseFloat(c.outstandingBalance || "0")}
          <a href="/customers/{c.id}" class="block">
            <div class="surface-card rounded-xl p-4 hover:border-border/80 transition-all group cursor-pointer">
              <div class="flex items-center gap-4">
                <!-- Avatar -->
                <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span class="text-[13px] font-bold text-primary">{getInitials(c.name)}</span>
                </div>
                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-[13px] font-bold text-foreground truncate">{c.name}</p>
                    <span class="inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold {tier.class}">{tier.label}</span>
                  </div>
                  <div class="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    {#if c.phone}
                      <span class="flex items-center gap-1"><Phone size={10} />{c.phone}</span>
                    {/if}
                    {#if c.email}
                      <span class="flex items-center gap-1 truncate"><Mail size={10} />{c.email}</span>
                    {/if}
                    {#if !c.phone && !c.email}
                      <span>No contact info</span>
                    {/if}
                    <span>·</span>
                    <span>{c.visitCount} visit{c.visitCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <!-- Spent -->
                <div class="text-right shrink-0">
                  <p class="text-[13px] font-bold text-foreground tabular-nums">{data.activeShop?.currencySymbol ?? '$'}{parseFloat(c.totalSpent || "0").toLocaleString(data.activeShop?.currencyLocale ?? "en-US", { maximumFractionDigits: 0 })}</p>
                  <p class="text-[10px] text-muted-foreground">total spent</p>
                </div>
                <!-- Outstanding -->
                {#if outstanding > 0}
                  <div class="text-right shrink-0">
                    <p class="text-[13px] font-bold text-amber-500 tabular-nums">{data.activeShop?.currencySymbol ?? '$'}{outstanding.toLocaleString(data.activeShop?.currencyLocale ?? "en-US", { maximumFractionDigits: 0 })}</p>
                    <p class="text-[10px] text-muted-foreground">due</p>
                  </div>
                {/if}
                <!-- Actions -->
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onclick={(e: Event) => e.preventDefault()}>
                  <button class="p-1.5 rounded-md hover:bg-secondary transition-colors" onclick={() => openEdit(c)} title="Edit">
                    <Pencil size={13} class="text-muted-foreground" />
                  </button>
                  <button class="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors" onclick={() => handleDelete(c)} title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Dialog -->
{#if showDialog}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="w-full max-w-md rounded-xl border border-border/50 bg-background p-6 shadow-2xl">
      <h2 class="text-[15px] font-bold text-foreground mb-4">{editingId ? "Edit Customer" : "New Customer"}</h2>
      {#if saveError}
        <div class="mb-4 rounded-lg bg-destructive/10 p-3 text-[12px] text-destructive border border-destructive/20 font-semibold">{saveError}</div>
      {/if}
      <form onsubmit={handleSave} class="space-y-4">
        <div class="space-y-1.5">
          <Label class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
          <Input bind:value={formName} placeholder="e.g. Priya Sharma" required class="h-10 rounded-lg bg-muted/20 text-[13px]" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <Label class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Phone</Label>
            <Input bind:value={formPhone} type="tel" placeholder="e.g. 9876543210" class="h-10 rounded-lg bg-muted/20 text-[13px]" />
          </div>
          <div class="space-y-1.5">
            <Label class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input bind:value={formEmail} type="email" placeholder="e.g. priya@email.com" class="h-10 rounded-lg bg-muted/20 text-[13px]" />
          </div>
        </div>
        <div class="space-y-1.5">
          <Label class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Notes</Label>
          <textarea
            bind:value={formNotes}
            rows="2"
            placeholder="Any additional notes..."
            class="w-full rounded-lg bg-muted/20 border border-border/50 px-3 py-2 text-[13px] font-medium outline-none focus:border-primary/50 transition-colors resize-none"
          ></textarea>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onclick={() => (showDialog = false)} disabled={isSaving} class="h-9 px-4 rounded-lg text-[12px] font-bold">Cancel</Button>
          <Button type="submit" disabled={isSaving || !formName.trim()} class="h-9 px-5 rounded-lg text-[12px] font-bold">
            {#if isSaving}<Loader2 class="mr-2 h-3.5 w-3.5 animate-spin" />{/if}
            {editingId ? "Save Changes" : "Add Customer"}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}
