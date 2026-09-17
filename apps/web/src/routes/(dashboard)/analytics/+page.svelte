<script lang="ts">
  import { goto } from "$app/navigation";
  import {
    TrendingUp, BarChart3, Activity, Banknote, Clock
  } from "lucide-svelte";

  let { data }: { data: any } = $props();
  const a = $derived(data.analytics);
  const period = $derived(data.period);

  const CHART_COLORS = ["hsl(var(--primary))", "#06b6d4", "#f59e0b", "#f43f5e", "#8b5cf6", "#10b981"];

  const PRESETS = [
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "7 days", value: "7d" },
    { label: "30 days", value: "30d" },
    { label: "90 days", value: "90d" },
    { label: "This Month", value: "this_month" },
    { label: "Last Month", value: "last_month" },
    { label: "This Year", value: "this_year" },
  ];

  function setPeriod(p: string) {
    goto(`/analytics?period=${p}`, { replaceState: true });
  }

  function fmt(n: number): string {
    const locale = data.activeShop?.currencyLocale ?? "en-US";
    const currency = data.activeShop?.currencyCode ?? "USD";
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  }
  function fmtShort(n: number): string {
    const symbol = data.activeShop?.currencySymbol ?? "$";
    if (n >= 100000) return `${symbol}${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `${symbol}${(n / 1000).toFixed(1)}K`;
    return `${symbol}${n.toFixed(0)}`;
  }
  function fmtPct(n: number): string { return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`; }

  function trendColor(d: { pct: number; direction: string } | null): string {
    if (!d) return "";
    return d.direction === "up" ? "text-emerald-600" : "text-rose-500";
  }

  // ── SVG area chart builders ──────────────────────────────────
  function buildAreaPath(vals: number[], w: number, h: number): string {
    if (vals.length === 0) return "";
    const max = Math.max(...vals, 1);
    const step = w / (vals.length - 1 || 1);
    const pts = vals.map((v, i) => ({ x: i * step, y: h - (v / max) * h }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const c1x = pts[i - 1].x + step * 0.4;
      const c2x = pts[i].x - step * 0.4;
      d += ` C ${c1x} ${pts[i - 1].y}, ${c2x} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
    }
    return d;
  }

  function buildAreaFill(vals: number[], w: number, h: number): string {
    const p = buildAreaPath(vals, w, h);
    if (!p) return "";
    const step = w / (vals.length - 1 || 1);
    return `${p} L ${(vals.length - 1) * step} ${h} L 0 ${h} Z`;
  }

  // Trend chart
  const CW = 700;
  const CH = 200;
  const trendValues = $derived(a ? a.trendData.map((d: any) => d.revenue) : []);
  const trendMax = $derived(Math.max(...trendValues, 1));
  const trendLabel = $derived(
    period === 'today' ? 'Today (hourly)'
    : period === 'yesterday' ? 'Yesterday (hourly)'
    : period === '7d' ? 'Last 7 days'
    : period === '30d' ? 'Last 30 days'
    : period === '90d' ? 'Last 90 days (weekly)'
    : period === 'this_month' ? 'This month'
    : period === 'last_month' ? 'Last month'
    : period === 'this_year' ? 'This year (monthly)'
    : 'Revenue Trend'
  );

  // Busiest hours
  const busiestHours = $derived(a?.busiestHours ?? []);
  const busyMax = $derived(a?.busyMax ?? 1);

  // Category max
  const catMax = $derived(a ? Math.max(...a.categories.map((c: any) => c.revenue), 1) : 1);

  // Chart interactivity
  let hoverIdx = $state<number | null>(null);
</script>

<div class="h-full max-h-full overflow-y-auto">
  <div class="mx-auto w-full max-w-7xl space-y-6 animate-fade-in p-6 md:p-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <h1 class="text-[22px] md:text-[26px] font-bold tracking-tight">Analytics</h1>
      <div class="flex flex-wrap gap-1.5">
        {#each PRESETS as p}
          <button
            onclick={() => setPeriod(p.value)}
            class="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all
              {period === p.value ? 'bg-foreground text-background' : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary'}"
          >
            {p.label}
          </button>
        {/each}
      </div>
    </div>

    {#if !a}
      <div class="flex items-center justify-center h-64 text-muted-foreground">
        <p class="text-[13px]">Loading analytics…</p>
      </div>
    {:else}

      <!-- ── KPI STRIP ─────────────────────────────────────────── -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="surface-card p-4 rounded-xl border border-border/40">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10">
              <TrendingUp size={15} class="text-primary" />
            </div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Revenue</span>
          </div>
          <p class="text-[20px] font-extrabold tabular-nums">{fmtShort(a.kpis.revenue.current)}</p>
          {#if a.kpis.revenue.delta}
            <p class="text-[10px] font-bold mt-1 {trendColor(a.kpis.revenue.delta)}">{fmtPct(a.kpis.revenue.delta.pct)}</p>
          {/if}
        </div>
        <div class="surface-card p-4 rounded-xl border border-border/40">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/10">
              <Activity size={15} class="text-cyan-600" />
            </div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Sales</span>
          </div>
          <p class="text-[20px] font-extrabold tabular-nums">{a.kpis.transactions.current}</p>
          {#if a.kpis.transactions.delta}
            <p class="text-[10px] font-bold mt-1 {trendColor(a.kpis.transactions.delta)}">{fmtPct(a.kpis.transactions.delta.pct)}</p>
          {/if}
        </div>
        <div class="surface-card p-4 rounded-xl border border-border/40">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10">
              <BarChart3 size={15} class="text-amber-600" />
            </div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Avg Order</span>
          </div>
          <p class="text-[20px] font-extrabold tabular-nums">{fmtShort(a.kpis.avgOrder.current)}</p>
          {#if a.kpis.avgOrder.delta}
            <p class="text-[10px] font-bold mt-1 {trendColor(a.kpis.avgOrder.delta)}">{fmtPct(a.kpis.avgOrder.delta.pct)}</p>
          {/if}
        </div>
        <div class="surface-card p-4 rounded-xl border border-border/40">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10">
              <Banknote size={15} class="text-emerald-600" />
            </div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Profit</span>
          </div>
          <p class="text-[20px] font-extrabold tabular-nums {a.grossProfit.current >= 0 ? 'text-emerald-600' : 'text-rose-500'}">{fmtShort(a.grossProfit.current)}</p>
          {#if a.grossProfit.delta}
            <p class="text-[10px] font-bold mt-1 {trendColor(a.grossProfit.delta)}">{fmtPct(a.grossProfit.delta.pct)}</p>
          {/if}
        </div>
      </div>

      <!-- ── DASHBOARD GRID ──────────────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        
        <!-- ROW 1 -->
        <!-- Revenue Trend -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="surface-card rounded-xl border border-border/40 p-5 col-span-1 lg:col-span-2 xl:col-span-3 flex flex-col group relative"
             onpointerleave={() => hoverIdx = null}>
          <h3 class="text-[13px] font-bold text-foreground mb-4">Revenue Trend · {trendLabel}</h3>
          <div class="flex-1 min-h-[220px] w-full overflow-x-auto relative">
            <svg viewBox="0 0 {CW} {CH + 30}" class="w-full h-full min-w-[500px]" preserveAspectRatio="none">
              {#each [0, 0.25, 0.5, 0.75, 1] as frac}
                <line x1="0" y1={CH * frac} x2={CW} y2={CH * frac} stroke="hsl(var(--border))" stroke-dasharray="4 4" opacity="0.4" />
              {/each}
              <path d={buildAreaFill(trendValues, CW, CH)} fill="hsl(var(--primary))" opacity="0.08" />
              <path d={buildAreaPath(trendValues, CW, CH)} fill="none" stroke="hsl(var(--primary))" stroke-width="2.5" stroke-linecap="round" />
              
              <!-- Crosshair and active circle -->
              {#if hoverIdx !== null && a.trendData[hoverIdx]}
                {@const hx = (hoverIdx / (trendValues.length - 1 || 1)) * CW}
                {@const hy = CH - (trendValues[hoverIdx] / trendMax) * CH}
                <line x1={hx} y1="0" x2={hx} y2={CH} stroke="hsl(var(--primary))" stroke-width="1" stroke-dasharray="4 4" opacity="0.5" />
                <circle cx={hx} cy={hy} r="6" fill="hsl(var(--primary))" class="animate-pulse" />
                <circle cx={hx} cy={hy} r="3" fill="hsl(var(--background))" />
              {/if}

              <!-- Base circles -->
              {#each trendValues as v, i}
                {@const x = (i / (trendValues.length - 1 || 1)) * CW}
                {@const y = CH - (v / trendMax) * CH}
                <circle cx={x} cy={y} r="4" fill="hsl(var(--background))" stroke="hsl(var(--primary))" stroke-width="2" class="transition-opacity {hoverIdx !== null && hoverIdx !== i ? 'opacity-30' : ''}" />
              {/each}

              <!-- Labels -->
              {#each a.trendData as d, i}
                {@const x = (i / (a.trendData.length - 1 || 1)) * CW}
                <text x={x} y={CH + 18} text-anchor="middle" font-size="10" fill="hsl(var(--muted-foreground))" class="transition-opacity {hoverIdx !== null && hoverIdx !== i ? 'opacity-30' : ''}">
                  {new Date(d.date).toLocaleDateString(data.activeShop?.currencyLocale ?? "en-US", { weekday: "short", day: "numeric" })}
                </text>
              {/each}

              <!-- Hover interaction overlay -->
              {#each a.trendData as _, i}
                {@const x = (i / (a.trendData.length - 1 || 1)) * CW}
                {@const w = CW / (a.trendData.length - 1 || 1)}
                <rect 
                  x={x - w/2} 
                  y="0" 
                  width={w} 
                  height={CH + 30} 
                  fill="transparent" 
                  class="cursor-crosshair"
                  onpointerenter={() => hoverIdx = i}
                />
              {/each}
            </svg>

            <!-- HTML Tooltip -->
            {#if hoverIdx !== null && a.trendData[hoverIdx]}
              {@const d = a.trendData[hoverIdx]}
              {@const pctX = (hoverIdx / (a.trendData.length - 1 || 1)) * 100}
              <div 
                class="absolute top-2 pointer-events-none transition-all duration-100 ease-out z-10"
                style="left: {pctX}%; transform: translateX({pctX > 80 ? '-100%' : pctX < 20 ? '0%' : '-50%'}); marginLeft: {pctX > 80 ? '-16px' : pctX < 20 ? '16px' : '0'}"
              >
                <div class="bg-background/95 backdrop-blur-md border border-border shadow-xl rounded-lg p-3 min-w-[140px] animate-fade-in relative overflow-hidden">
                  <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50"></div>
                  <p class="text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                    {new Date(d.date).toLocaleDateString(data.activeShop?.currencyLocale ?? "en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                  <p class="text-[18px] font-extrabold tabular-nums text-foreground">{fmt(d.revenue)}</p>
                  <p class="text-[11px] text-muted-foreground mt-1"><span class="font-bold text-primary">{d.count}</span> sales</p>
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Busiest Hours -->
        <div class="surface-card rounded-xl border border-border/40 p-5 col-span-1">
          <h3 class="text-[13px] font-bold text-foreground mb-4">Busiest Hours</h3>
          {#if busiestHours.length === 0}
            <p class="text-[12px] text-muted-foreground text-center py-8">No data</p>
          {:else}
            <div class="space-y-1.5 overflow-y-auto max-h-[220px] pr-1">
              {#each busiestHours as bh}
                {@const pct = (bh.count / busyMax) * 100}
                <div class="flex items-center gap-3">
                  <span class="text-[11px] font-mono font-bold text-muted-foreground w-10 shrink-0 text-right">{bh.label}</span>
                  <div class="flex-1 h-3 rounded-sm bg-secondary/40 overflow-hidden">
                    <div
                      class="h-full rounded-sm transition-all"
                      style="width:{Math.max(pct, 2)}%;background:hsl(var(--primary));opacity:{0.2 + (pct / 100) * 0.8}"
                    ></div>
                  </div>
                  <span class="text-[10px] font-bold text-muted-foreground w-10 text-right tabular-nums">{bh.count}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- ROW 2 -->
        <!-- Top Products -->
        <div class="surface-card rounded-xl border border-border/40 p-5 col-span-1 lg:col-span-2 xl:col-span-3">
          <h3 class="text-[13px] font-bold text-foreground mb-4">Top Products</h3>
          {#if a.products.byRevenue.length === 0}
            <p class="text-[12px] text-muted-foreground text-center py-8">No product data</p>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
              {#each a.products.byRevenue.slice(0, 9) as prod, i}
                <div class="flex items-center gap-3 py-2 border-b border-border/20 md:border-none">
                  <span class="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0
                    {i < 3 ? 'bg-amber-500/10 text-amber-600' : 'bg-secondary text-muted-foreground'}">
                    {i + 1}
                  </span>
                  <div class="flex-1 min-w-0">
                    <p class="text-[12px] font-semibold text-foreground truncate">{prod.name}</p>
                    <p class="text-[10px] text-muted-foreground">{prod.units} units · {prod.margin.toFixed(0)}% margin</p>
                  </div>
                  <span class="text-[12px] font-bold tabular-nums shrink-0">{fmtShort(prod.revenue)}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Inventory Valuation (Moved up) -->
        <div class="surface-card rounded-xl border border-border/40 p-5 col-span-1 flex flex-col justify-between">
          <div>
            <h3 class="text-[13px] font-bold text-foreground mb-1">Inventory Valuation</h3>
            <p class="text-[11px] text-muted-foreground mb-5">Current stock value and profit</p>
          </div>
          
          <div class="space-y-4">
            <div class="flex items-end justify-between">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Retail</p>
                <p class="text-[24px] leading-none font-extrabold tabular-nums tracking-tight">{fmtShort(a.stockValue.retailValue)}</p>
              </div>
              <div class="text-right">
                <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">In Stock</p>
                <p class="text-[16px] leading-none font-bold tabular-nums text-foreground">{a.stockValue.totalUnits.toLocaleString()} <span class="text-[11px] text-muted-foreground font-normal">units</span></p>
              </div>
            </div>

            {#if a.stockValue.retailValue !== undefined}
              {@const costPct = a.stockValue.retailValue > 0 ? (a.stockValue.costValue / a.stockValue.retailValue) * 100 : 0}
              <div>
                <div class="flex items-center justify-between text-[10px] font-bold mb-2">
                  <div class="flex flex-col">
                    <span class="text-muted-foreground uppercase tracking-widest text-[9px]">Sunk Cost</span>
                    <span class="text-foreground">{fmtShort(a.stockValue.costValue)} <span class="text-muted-foreground font-normal">({costPct.toFixed(0)}%)</span></span>
                  </div>
                  <div class="flex flex-col text-right">
                    <span class="text-emerald-600 uppercase tracking-widest text-[9px]">Est. Profit</span>
                    <span class="text-emerald-600">{fmtShort(a.stockValue.retailValue - a.stockValue.costValue)} <span class="opacity-80 font-normal">({(100 - costPct).toFixed(0)}%)</span></span>
                  </div>
                </div>
                
                <div class="h-2.5 w-full rounded-full bg-secondary/30 flex overflow-hidden p-0.5">
                  <div class="h-full rounded-full bg-secondary/80" style="width: {costPct}%"></div>
                  <div class="h-full rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] relative" style="width: {100 - costPct}%; margin-left: -2px;"></div>
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- ROW 3 -->
        <!-- Categories (Moved down) -->
        <div class="surface-card rounded-xl border border-border/40 p-5 col-span-1 lg:col-span-2">
          <h3 class="text-[13px] font-bold text-foreground mb-4">Top Categories</h3>
          {#if a.categories.length === 0}
            <p class="text-[12px] text-muted-foreground text-center py-8">No category data</p>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              {#each a.categories.slice(0, 6) as cat, i}
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-[12px] font-semibold text-foreground truncate mr-2">{cat.name}</span>
                    <div class="flex items-center gap-3 shrink-0">
                      <span class="text-[10px] text-muted-foreground">{cat.units} units</span>
                      <span class="text-[12px] font-bold tabular-nums">{fmtShort(cat.revenue)}</span>
                    </div>
                  </div>
                  <div class="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                    <div class="h-full rounded-full" style="width:{(cat.revenue / catMax) * 100}%;background:{CHART_COLORS[i % CHART_COLORS.length]}"></div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Outstanding credit & Top Customers -->
        <div class="col-span-1 lg:col-span-2 space-y-4">
          <!-- Outstanding Credit -->
          {#if a.outstanding && a.outstanding.total > 0}
            <div class="surface-card rounded-xl border border-border/40 p-5 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 class="text-[13px] font-bold text-foreground">Outstanding Credit</h3>
                  <p class="text-[11px] text-muted-foreground">
                    <span class="font-bold">{fmt(a.outstanding.byStatus.pending)}</span> pending · 
                    <span class="font-bold">{fmt(a.outstanding.byStatus.partial)}</span> partial
                  </p>
                </div>
              </div>
              <span class="text-[18px] font-extrabold text-amber-600">{fmtShort(a.outstanding.total)}</span>
            </div>
          {/if}

          <!-- Customers -->
          {#if a.topCustomers.length > 0}
            <div class="surface-card rounded-xl border border-border/40 p-5">
              <h3 class="text-[13px] font-bold text-foreground mb-4">Top Customers</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {#each a.topCustomers.slice(0, 4) as cust, i}
                  <a href="/customers/{cust.id}" class="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-secondary/30 transition-colors border border-border/20">
                    <span class="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0
                      {i < 3 ? 'bg-amber-500/10 text-amber-600' : 'bg-secondary text-muted-foreground'}">
                      {i + 1}
                    </span>
                    <div class="flex-1 min-w-0 flex flex-col justify-center">
                      <p class="text-[12px] font-semibold text-foreground truncate leading-tight">{cust.name}</p>
                      <p class="text-[10px] text-muted-foreground leading-tight">{cust.visits} visits</p>
                    </div>
                    <span class="text-[12px] font-bold tabular-nums shrink-0">{fmtShort(cust.spent)}</span>
                  </a>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>

    {/if}
  </div>
</div>
