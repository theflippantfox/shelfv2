<script lang="ts">
  import { 
    Search, Receipt, Banknote, Clock, ArrowLeftRight, 
    X, Calendar, TrendingUp, Wallet
  } from "lucide-svelte";

  let { data }: { data: any } = $props();
  let search = $state("");
  type StatusFilter = "all" | "completed" | "voided";
  let statusFilter = $state<StatusFilter>("all");
  type MethodFilter = "all" | "cash" | "credit" | "transfer";
  let methodFilter = $state<MethodFilter>("all");
  type RangeFilter = "all" | "today" | "7d" | "30d";
  let rangeFilter = $state<RangeFilter>("all");

  /* ── Helpers ──────────────────────────────────────── */
  const PAY_META: Record<string, { icon: any; label: string; color: string }> = {
    cash:     { icon: Banknote,       label: "Cash",  color: "hsl(var(--chart-cobalt))" },
    credit:   { icon: Clock,          label: "Credit", color: "hsl(38 92% 50%)" },
    transfer: { icon: ArrowLeftRight, label: "UPI",   color: "hsl(142 71% 45%)" },
  };

  function formatPrice(val: number | string): string {
    const locale = data.activeShop?.currencyLocale ?? "en-US";
    const currency = data.activeShop?.currencyCode ?? "USD";
    return new Intl.NumberFormat(locale, {
      style: "currency", currency,
    }).format(Number(val));
  }

  function formatCompact(val: number | string): string {
    const n = Number(val);
    const symbol = data.activeShop?.currencySymbol ?? "$";
    if (n >= 100000) return `${symbol}${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `${symbol}${(n / 1000).toFixed(1)}K`;
    return formatPrice(n);
  }

  function formatRelative(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString(data.activeShop?.currencyLocale ?? "en-US", { day: "numeric", month: "short" });
  }

  function formatFull(dateStr: string): string {
    const locale = data.activeShop?.currencyLocale ?? "en-US";
    return new Intl.DateTimeFormat(locale, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(dateStr));
  }

  function creditChip(status: string) {
    if (status === "partial") return { label: "Partial", cls: "bg-amber-500/10 text-amber-500" };
    if (status === "pending") return { label: "Pending", cls: "bg-destructive/10 text-destructive" };
    if (status === "paid")    return { label: "Paid",    cls: "bg-emerald-500/10 text-emerald-500" };
    return null;
  }

  function inRange(dateStr: string, range: RangeFilter): boolean {
    if (range === "all") return true;
    const d = new Date(dateStr);
    const now = new Date();
    if (range === "today") return d.toDateString() === now.toDateString();
    const cutoff = new Date(now);
    if (range === "7d") cutoff.setDate(cutoff.getDate() - 7);
    if (range === "30d") cutoff.setDate(cutoff.getDate() - 30);
    return d >= cutoff;
  }

  /* ── 30-Day Activity Calendar ─────────────────────── */

  const calendarMonth = $derived.by(() => {
    const completed = (data.transactions as any[]).filter(t => t.status === "completed");

    // Aggregate daily revenue
    const dailyRevenue = new Map<string, number>();
    const dailySales = new Map<string, number>();
    for (const t of completed) {
      const d = new Date(t.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      dailyRevenue.set(key, (dailyRevenue.get(key) ?? 0) + Number(t.totalAmount));
      dailySales.set(key, (dailySales.get(key) ?? 0) + 1);
    }

    // Find max for intensity
    let maxRevenue = 0;
    for (const v of dailyRevenue.values()) {
      if (v > maxRevenue) maxRevenue = v;
    }

    // Build 30 days ending today
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);

    // Pad to start on a Sunday
    const padStart = new Date(startDate);
    padStart.setDate(padStart.getDate() - padStart.getDay());

    // Build full grid from padStart to today (including trailing days)
    const cells: { date: Date; key: string; revenue: number; sales: number; level: number; inRange: boolean }[] = [];
    let current = new Date(padStart);

    while (current <= today) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
      const revenue = dailyRevenue.get(key) ?? 0;
      const sales = dailySales.get(key) ?? 0;
      const inRange = current >= startDate;
      const level = !inRange ? -1 :
        maxRevenue === 0 ? 0 :
        revenue === 0 ? 0 :
        revenue < maxRevenue * 0.25 ? 1 :
        revenue < maxRevenue * 0.5 ? 2 :
        revenue < maxRevenue * 0.75 ? 3 : 4;

      cells.push({ date: new Date(current), key, revenue, sales, level, inRange });
      current.setDate(current.getDate() + 1);
    }

    // Group into weeks
    const weeks: typeof cells[] = [];
    let week: typeof cells = [];
    for (const cell of cells) {
      week.push(cell);
      if (cell.date.getDay() === 6) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) weeks.push(week);

    // Month label
    const monthName = today.toLocaleDateString(data.activeShop?.currencyLocale ?? "en-US", { month: "long", year: "numeric" });

    // Totals for the 30-day window
    let windowRevenue = 0;
    let windowSales = 0;
    for (const cell of cells) {
      if (cell.inRange) {
        windowRevenue += cell.revenue;
        windowSales += cell.sales;
      }
    }

    // Daily avg
    const daysWithData = cells.filter(c => c.inRange && c.revenue > 0).length;
    const dailyAvg = daysWithData > 0 ? windowRevenue / daysWithData : 0;

    // Best day
    let bestDay = "";
    let bestRevenue = 0;
    for (const cell of cells) {
      if (cell.inRange && cell.revenue > bestRevenue) {
        bestRevenue = cell.revenue;
        bestDay = cell.date.toLocaleDateString(data.activeShop?.currencyLocale ?? "en-US", { day: "numeric", month: "short" });
      }
    }

    return { weeks, monthName, windowRevenue, windowSales, dailyAvg, bestDay, bestRevenue, maxRevenue };
  });

  function calBg(level: number): string {
    switch (level) {
      case -1: return "transparent"; // outside range
      case 0:  return "hsl(var(--secondary))";
      case 1:  return "hsl(142 71% 45% / 0.2)";
      case 2:  return "hsl(142 71% 45% / 0.4)";
      case 3:  return "hsl(142 71% 45% / 0.65)";
      case 4:  return "hsl(142 71% 45% / 0.9)";
      default: return "hsl(var(--secondary))";
    }
  }

  function toKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  /* ── Derived data ─────────────────────────────────── */
  const allTx = $derived(data.transactions as any[]);

  const stats = $derived.by(() => {
    const completed = allTx.filter(t => t.status === "completed");
    const totalRev = completed.reduce((s, t) => s + Number(t.totalAmount), 0);
    const creditTotal = completed
      .filter(t => t.paymentMethod === "credit")
      .reduce((s, t) => s + Number(t.totalAmount), 0);
    const avgTicket = completed.length > 0 ? totalRev / completed.length : 0;
    return { total: allTx.length, completed: completed.length, totalRev, creditTotal, avgTicket };
  });

  const counts = $derived.by(() => {
    const method = { all: allTx.length, cash: 0, credit: 0, transfer: 0 };
    const status = { all: allTx.length, completed: 0, voided: 0 };
    for (const t of allTx) {
      if (t.paymentMethod in method) method[t.paymentMethod as keyof typeof method]++;
      if (t.status === "completed") status.completed++;
      if (t.status === "voided") status.voided++;
    }
    return { method, status };
  });

  const filtered = $derived.by(() => {
    let list = [...allTx];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        t.receiptId?.toLowerCase().includes(q) ||
        t.customerName?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") list = list.filter(t => t.status === statusFilter);
    if (methodFilter !== "all") list = list.filter(t => t.paymentMethod === methodFilter);
    if (rangeFilter !== "all") list = list.filter(t => inRange(t.createdAt, rangeFilter));
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  });

  const activeFilterCount = $derived(
    (search.trim() ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) +
    (methodFilter !== "all" ? 1 : 0) + (rangeFilter !== "all" ? 1 : 0)
  );

  function clearAll() {
    search = ""; statusFilter = "all"; methodFilter = "all"; rangeFilter = "all";
  }

  /* ── Chip config ──────────────────────────────────── */
  const statusChips: { key: StatusFilter; label: string; tone: string }[] = [
    { key: "all",       label: "All",       tone: "neutral" },
    { key: "completed", label: "Completed", tone: "teal" },
    { key: "voided",    label: "Voided",    tone: "crimson" },
  ];

  const methodChips: { key: MethodFilter; label: string }[] = [
    { key: "all",      label: "All Methods" },
    { key: "cash",     label: "Cash" },
    { key: "credit",   label: "Credit" },
    { key: "transfer", label: "UPI" },
  ];

  const rangeChips: { key: RangeFilter; label: string }[] = [
    { key: "all",   label: "All Time" },
    { key: "today", label: "Today" },
    { key: "7d",    label: "7 Days" },
    { key: "30d",   label: "30 Days" },
  ];
</script>

<svelte:head><title>Transactions | shëlf</title></svelte:head>

<div class="flex flex-col h-full max-h-full gap-4">
  <!-- Header -->
  <div class="shrink-0 flex items-end justify-between gap-3">
    <div>
      <h1 class="display-lg text-foreground">Transactions</h1>
      <p class="text-[11px] text-muted-foreground mt-1">
        {filtered.length} matching sale{filtered.length === 1 ? '' : 's'}
      </p>
    </div>
  </div>

  <!-- KPI strip -->
  <div class="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
    <div class="surface-card p-3 rounded-xl border border-border/40">
      <div class="flex items-center gap-2 mb-1.5">
        <div class="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
          <Receipt size={13} class="text-primary" />
        </div>
        <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Sales</span>
      </div>
      <p class="text-[22px] font-black tabular-nums leading-none text-foreground">{stats.completed}</p>
      <p class="text-[10px] text-muted-foreground mt-1">Completed transactions</p>
    </div>
    <div class="surface-card p-3 rounded-xl border border-border/40">
      <div class="flex items-center gap-2 mb-1.5">
        <div class="w-7 h-7 rounded-md bg-[hsl(222,100%,59%)]/10 flex items-center justify-center">
          <Wallet size={13} class="text-[hsl(222,100%,59%)]" />
        </div>
        <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Revenue</span>
      </div>
      <p class="text-[22px] font-black tabular-nums leading-none text-foreground">{formatCompact(stats.totalRev)}</p>
      <p class="text-[10px] text-muted-foreground mt-1">Total collected</p>
    </div>
    <div class="surface-card p-3 rounded-xl border border-border/40">
      <div class="flex items-center gap-2 mb-1.5">
        <div class="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center">
          <TrendingUp size={13} class="text-amber-500" />
        </div>
        <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Avg Ticket</span>
      </div>
      <p class="text-[22px] font-black tabular-nums leading-none text-foreground">{formatPrice(stats.avgTicket)}</p>
      <p class="text-[10px] text-muted-foreground mt-1">Per transaction</p>
    </div>
    <div class="surface-card p-3 rounded-xl border border-border/40">
      <div class="flex items-center gap-2 mb-1.5">
        <div class="w-7 h-7 rounded-md {stats.creditTotal > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'} flex items-center justify-center">
          <Clock size={13} class="{stats.creditTotal > 0 ? 'text-amber-500' : 'text-emerald-500'}" />
        </div>
        <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">On Credit</span>
      </div>
      <p class="text-[22px] font-black tabular-nums leading-none text-foreground">{formatCompact(stats.creditTotal)}</p>
      <p class="text-[10px] text-muted-foreground mt-1">{stats.creditTotal > 0 ? 'Outstanding' : 'All clear'}</p>
    </div>
  </div>

  <!-- Filter bar -->
  <div class="shrink-0 surface-card p-3 rounded-xl border border-border/40">
    <div class="flex flex-col md:flex-row md:items-center gap-3">
      <div class="relative flex-1 group">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" size={14} />
        <input
          placeholder="Search by receipt ID or customer…"
          bind:value={search}
          class="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border/50 text-[12px] font-medium outline-none focus:border-primary/50 transition-colors"
        />
      </div>
      <div class="flex items-center gap-1.5 flex-wrap">
        {#each methodChips as chip}
          {@const active = methodFilter === chip.key}
          <button
            type="button"
            onclick={() => (methodFilter = chip.key)}
            class="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-full border transition-all
              {active ? 'bg-secondary text-foreground border-secondary' : 'bg-transparent text-muted-foreground border-border/50 hover:bg-secondary/50'}"
          >
            {#if chip.key !== "all"}
              {#if chip.key === "cash"}<Banknote size={10} />{:else if chip.key === "credit"}<Clock size={10} />{:else}<ArrowLeftRight size={10} />{/if}
            {/if}
            {chip.label}
            <span class="inline-flex items-center justify-center min-w-[16px] h-[16px] px-0.5 rounded-full text-[9px] font-bold
              {active ? 'bg-foreground/10 text-foreground' : 'bg-secondary text-muted-foreground'}">
              {counts.method[chip.key]}
            </span>
          </button>
        {/each}
      </div>
    </div>

    <div class="flex items-center justify-between gap-2 mt-3 flex-wrap">
      <div class="flex items-center gap-1.5 flex-wrap">
        {#each statusChips as chip}
          {@const active = statusFilter === chip.key}
          <button
            type="button"
            onclick={() => (statusFilter = chip.key)}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-full border transition-all
              {active
                ? chip.tone === 'teal' ? 'bg-emerald-500 text-white border-emerald-500'
                  : chip.tone === 'crimson' ? 'bg-destructive text-white border-destructive'
                  : 'bg-secondary text-foreground border-secondary'
                : 'bg-transparent text-muted-foreground border-border/50 hover:border-border hover:bg-secondary/50'}"
          >
            {chip.label}
            <span class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold
              {active ? 'bg-white/20 text-white' : 'bg-secondary text-muted-foreground'}">
              {counts.status[chip.key]}
            </span>
          </button>
        {/each}

        <span class="text-muted-foreground/40 mx-1">·</span>

        {#each rangeChips as chip}
          {@const active = rangeFilter === chip.key}
          <button
            type="button"
            onclick={() => (rangeFilter = chip.key)}
            class="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-full border transition-all
              {active ? 'bg-secondary text-foreground border-secondary' : 'bg-transparent text-muted-foreground border-border/50 hover:bg-secondary/50'}"
          >
            <Calendar size={10} />
            {chip.label}
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

  <!-- Main content: Transactions + Calendar -->
  <div class="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
    <!-- Left: Transaction cards (scrollable) -->
    <div class="overflow-y-auto pr-1 -mr-1">
      {#if filtered.length === 0}
        <div class="flex flex-col items-center justify-center h-48 text-muted-foreground surface-card rounded-xl border border-dashed border-border/60">
          <Receipt size={32} class="mb-4 opacity-20" />
          <p class="text-[13px] font-semibold">
            {activeFilterCount > 0 ? "No matching transactions." : "No transactions yet."}
          </p>
          {#if activeFilterCount > 0}
            <button class="text-[11px] text-primary mt-2 font-bold" onclick={clearAll}>Clear filters</button>
          {/if}
        </div>
      {:else}
        <div class="space-y-2">
          {#each filtered as tx (tx.id)}
            {@const meta = PAY_META[tx.paymentMethod] ?? { icon: Banknote, label: tx.paymentMethod, color: "hsl(var(--muted-foreground))" }}
            {@const isVoided = tx.status === "voided"}
            {@const isCredit = tx.paymentMethod === "credit"}
            {@const cc = isCredit ? creditChip(tx.creditStatus) : null}
            {@const MethodIcon = meta.icon}
            <a href="/transactions/{tx.id}" class="surface-card p-3 md:p-4 flex items-center gap-3 rounded-xl border border-border/40 group hover:border-border/80 transition-all hover:shadow-sm
              {isVoided ? 'opacity-60' : ''}">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                   style="background: color-mix(in srgb, {meta.color} 14%, transparent)">
                <MethodIcon size={16} style="color: {meta.color}" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="font-mono text-[11px] font-bold text-primary">{tx.receiptId}</p>
                  {#if isVoided}
                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">Voided</span>
                  {:else}
                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">Completed</span>
                  {/if}
                  <span class="text-[10px] text-muted-foreground">· {meta.label}</span>
                  {#if cc}
                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded {cc.cls}">{cc.label}</span>
                  {/if}
                </div>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <p class="text-[12px] font-medium text-foreground truncate">
                    {tx.customerName || "Walk-in"}
                  </p>
                  <span class="text-[10px] text-muted-foreground">·</span>
                  <p class="text-[10px] text-muted-foreground whitespace-nowrap" title={formatFull(tx.createdAt)}>
                    {formatRelative(tx.createdAt)}
                  </p>
                </div>
              </div>
              <div class="text-right shrink-0">
                <p class="text-[14px] font-bold tabular-nums {isVoided ? 'line-through text-muted-foreground' : 'text-foreground'}">
                  {formatCompact(tx.totalAmount)}
                </p>
                <p class="text-[10px] text-muted-foreground tabular-nums">
                  {tx.items?.length ?? 0} item{(tx.items?.length ?? 0) === 1 ? '' : 's'}
                </p>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Right: 30-Day Activity Calendar -->
    <div class="surface-card rounded-xl border border-border/40 p-4 self-start lg:sticky lg:top-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Revenue Activity</h3>
        <span class="text-[10px] text-muted-foreground font-semibold">{calendarMonth.monthName}</span>
      </div>

      <!-- Calendar grid -->
      <div>
        <!-- Day-of-week headers -->
        <div class="grid grid-cols-7 gap-[3px] mb-[3px]">
          {#each ["S", "M", "T", "W", "T", "F", "S"] as d}
            <span class="text-center text-[9px] font-bold text-muted-foreground/50 h-[14px] leading-[14px]">{d}</span>
          {/each}
        </div>

        <!-- Week rows -->
        {#each calendarMonth.weeks as week}
          <div class="grid grid-cols-7 gap-[3px] mb-[3px]">
            {#each week as cell}
              {@const isToday = cell.key === toKey(new Date())}
              {@const isFuture = cell.date > new Date()}
              <div
                class="relative rounded-[3px] transition-all hover:scale-125 hover:z-10 cursor-default flex items-center justify-center border
                  {isToday ? 'border-primary/60 ring-1 ring-primary/30 z-10' : 'border-border/30'}
                  {isFuture ? 'opacity-40' : ''}"
                style="
                  width: 100%; aspect-ratio: 1;
                  background: {calBg(cell.level)};
                "
                title="{cell.date.toLocaleDateString(data.activeShop?.currencyLocale ?? 'en-US', { day: 'numeric', month: 'short' })}: {cell.revenue > 0 ? formatPrice(cell.revenue) + ' (' + cell.sales + ' sale' + (cell.sales === 1 ? '' : 's') + ')' : 'No sales'}"
              >
                <span class="text-[7px] font-bold leading-none select-none {cell.level >= 3 ? 'text-white/90' : cell.inRange ? 'text-muted-foreground' : 'text-muted-foreground/30'}">
                  {cell.date.getDate()}
                </span>
              </div>
            {/each}
          </div>
        {/each}
      </div>

      <!-- Legend -->
      <div class="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
        <span class="text-[9px] font-semibold text-muted-foreground/60">Less</span>
        <div class="flex items-center gap-[3px]">
          {#each [0, 1, 2, 3, 4] as level}
            <div class="rounded-[3px]" style="width: 11px; height: 11px; background: {calBg(level)};"></div>
          {/each}
        </div>
        <span class="text-[9px] font-semibold text-muted-foreground/60">More</span>
      </div>

      <!-- 30-day summary -->
      <div class="mt-3 pt-3 border-t border-border/40 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[10px] text-muted-foreground">30-day revenue</span>
          <span class="text-[13px] font-black tabular-nums text-foreground">{formatCompact(calendarMonth.windowRevenue)}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-[10px] text-muted-foreground">Daily average</span>
          <span class="text-[12px] font-bold tabular-nums text-foreground">{formatPrice(calendarMonth.dailyAvg)}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-[10px] text-muted-foreground">Best day</span>
          <span class="text-[11px] font-bold text-foreground">{calendarMonth.bestDay || '—'} <span class="text-muted-foreground">{calendarMonth.bestRevenue > 0 ? formatCompact(calendarMonth.bestRevenue) : ''}</span></span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-[10px] text-muted-foreground">Total sales</span>
          <span class="text-[12px] font-bold tabular-nums text-foreground">{calendarMonth.windowSales}</span>
        </div>
      </div>
    </div>
  </div>
</div>
