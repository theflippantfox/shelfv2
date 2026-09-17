<script lang="ts">
  import { CreditCard, ArrowUpRight, Wallet, TrendingUp, Calculator, Package } from 'lucide-svelte';
  


  // Receive the dynamically loaded metrics from SvelteKit's Load function (SSR)
  let { data } = $props<{ data: { dashboardData: any } }>();
  
  // map the metrics from Hono API dynamically using a derived rune for complete reactivity in Svelte 5
  const metrics = $derived(data.dashboardData?.metrics?.map((m: any) => {
    let icon = CreditCard;
    if (m.label.includes("Net")) icon = Wallet;
    if (m.label.includes("Sales")) icon = TrendingUp;
    if (m.label.includes("Average")) icon = Calculator;
    
    return { ...m, icon };
  }) || []);

  const chartData = $derived(data.dashboardData?.chartData || []);
  const topProducts = $derived(data.dashboardData?.topProducts || []);
  const inventoryStats = $derived(data.dashboardData?.inventoryStats || { retailValue: 0, costValue: 0, totalUnits: 0 });
  const recentTransactions = $derived(data.dashboardData?.recentTransactions || []);
  const lowStockItems = $derived(data.dashboardData?.lowStockItems || []);

  // Smooth Cubic Bezier Line Generator for Area Chart
  const getCurvePath = (data: any[], maxRev: number, isFill = false) => {
    if (data.length === 0) return "";
    
    let path = "";
    
    data.forEach((point, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 92 - (point.revenue / maxRev) * 82; // 92 base, peak at 10 (padded)
      
      if (i === 0) {
        path += `M ${x} ${y} `;
      } else {
        const prevX = ((i - 1) / (data.length - 1)) * 100;
        const prevY = 92 - (data[i - 1].revenue / maxRev) * 82;
        
        // Control points for smooth bezier (horizontal tangents)
        const cp1x = prevX + (x - prevX) * 0.5;
        const cp1y = prevY;
        const cp2x = prevX + (x - prevX) * 0.5;
        const cp2y = y;
        
        path += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y} `;
      }
    });
    
    if (isFill) {
      path += `L 100 100 L 0 100 Z`;
    }
    return path;
  };

  const maxRevenue = $derived(Math.max(...chartData.map((d: any) => d.revenue), 1));
  const areaPath = $derived(getCurvePath(chartData, maxRevenue, true));
  const linePath = $derived(getCurvePath(chartData, maxRevenue, false));
</script>

<div class="space-y-6">
  <!-- Interactive View Header -->
  <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6">
    <div>
      <h2 class="display-lg text-foreground tracking-tight">Overview</h2>
      <p class="text-[13px] text-muted-foreground leading-none mt-1">Daily snapshot of your store's performance.</p>
    </div>
    
    <div class="flex items-center gap-2">
      <button class="inline-flex items-center justify-center rounded-lg border border-border bg-white px-3 py-1.5 text-[12px] font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 flex-shrink-0 transition-all dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800">
        Download Report
      </button>
      <a href="/pos" class="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground shadow-sm flex-shrink-0 hover:bg-primary/90 transition-all">
        Create Sale
      </a>
    </div>
  </div>

  <!-- Metric Overview Cards -->
  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {#each metrics as metric}
      <div class="surface-card rounded-xl px-4 py-3 transition-transform duration-200 hover:-translate-y-[1px]">
        <div class="flex flex-row items-center justify-between pb-1.5">
          <h3 class="text-[9.5px] uppercase font-bold tracking-[0.06em] text-muted-foreground truncate pr-2">{metric.label}</h3>
          <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-primary/10 text-primary">
            <metric.icon size={11} strokeWidth={3} />
          </div>
        </div>
        <div>
          <div class="text-[17px] font-extrabold text-foreground tabular tracking-tighter leading-none mt-0.5">{metric.value}</div>
          <p class="mt-1.5 text-[9.5px] font-medium text-muted-foreground whitespace-nowrap truncate">
            <span class={metric.trend === 'up' ? 'text-primary font-bold' : metric.trend === 'down' ? 'text-destructive font-bold' : ''}>
              {metric.change.split(' ')[0]}
            </span>
            {metric.change.split(' ').slice(1).join(' ')}
          </p>
        </div>
      </div>
    {/each}
  </div>

  <!-- Main Data Sections -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 items-start">
    
    <!-- Hero Chart (Full Width) -->
    <div class="lg:col-span-2 flex flex-col surface-card rounded-xl min-h-[300px]">
      <div class="px-4 py-3 border-b border-border/30 flex justify-between items-center bg-card/40 rounded-t-xl">
        <h3 class="text-[11.5px] font-bold uppercase tracking-wider text-foreground">7-Day Revenue</h3>
        <div class="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground select-none">Live Data</div>
      </div>
      <div class="flex-1 w-full h-[250px] p-0 relative">
        <!-- Area Chart SVG -->
        <svg viewBox="0 -10 100 110" preserveAspectRatio="none" class="absolute inset-0 w-full h-full pb-6 pt-3 px-2">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="hsl(var(--cobalt))" stop-opacity="0.3"></stop>
              <stop offset="80%" stop-color="hsl(var(--cobalt))" stop-opacity="0.05"></stop>
              <stop offset="100%" stop-color="hsl(var(--cobalt))" stop-opacity="0.0"></stop>
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {#if chartData.length > 0}
            <!-- Horizontal background guidelines -->
            <line x1="0" y1="10" x2="100" y2="10" stroke="currentColor" class="text-border opacity-50" stroke-width="0.1" stroke-dasharray="1 1" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" class="text-border opacity-50" stroke-width="0.1" stroke-dasharray="1 1" />
            <line x1="0" y1="92" x2="100" y2="92" stroke="currentColor" class="text-border/80" stroke-width="0.2" />

            <!-- Fluid Area Path -->
            <path d={areaPath} fill="url(#chartGradient)" />
            
            <!-- Curving Bold Line Path with Glow -->
            <path d={linePath} fill="none" stroke="hsl(var(--cobalt))" stroke-width="0.8" vector-effect="non-scaling-stroke" filter="url(#glow)" />
            
            <!-- Refined Data Points -->
            {#each chartData as point, i (point.date)}
               {@const x = (i / (chartData.length - 1)) * 100}
               {@const y = 92 - (point.revenue / maxRevenue) * 82}
               <circle cx={x} cy={y} r="1" fill="var(--card)" stroke="hsl(var(--cobalt))" stroke-width="0.4" vector-effect="non-scaling-stroke" class="cursor-pointer transition-transform hover:scale-[1.8] origin-center z-10 hover:fill-[hsl(var(--cobalt))]" />
            {/each}
          {/if}
        </svg>
        
        <!-- X-Axis Labels & Integrated Tooltip Hover Zones -->
        <div class="absolute inset-0 w-full h-full flex justify-between items-end pb-1 px-4 pointer-events-none">
          {#each chartData as point}
            <div class="h-full flex flex-col justify-end items-center flex-1 relative group pointer-events-auto z-20 hover:bg-muted/10 transition-colors">
              <!-- Tooltip Box (Floating Above Node) -->
              <div class="absolute top-[30%] opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background shadow-lg px-2.5 py-1.5 rounded-md text-[10.5px] font-bold whitespace-nowrap pointer-events-none tracking-wide -translate-y-6">
                ${point.revenue.toLocaleString('en-US', {minimumFractionDigits: 2})}
              </div>
              <!-- Interactive Vertical Tracer Line on Hover -->
              <div class="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-[hsl(var(--cobalt))]/30 opacity-0 group-hover:opacity-100 -z-10 bottom-6 pointer-events-none"></div>
              <!-- Static Axis Label -->
              <span class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none pt-4 group-hover:text-[hsl(var(--cobalt))] transition-colors">{point.date.slice(0,3)}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
      
    <!-- Left Column: Top Sellers & Low Stock -->
    <div class="flex flex-col gap-4 w-full">
      <!-- Top Sellers Table -->
      <div class="flex flex-col surface-card rounded-xl overflow-hidden self-start w-full">
        <div class="px-4 py-3 border-b border-border/30 bg-card/40 rounded-t-xl flex justify-between items-center">
          <div class="flex items-center gap-2">
            <TrendingUp size={15} class="text-primary" />
            <h3 class="text-[11.5px] font-bold uppercase tracking-wider text-foreground">Top Movers</h3>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-border/20 bg-muted/5">
                <th class="px-4 py-2.5 text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground w-12 text-center">Rank</th>
                <th class="px-4 py-2.5 text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground">Product</th>
                <th class="px-4 py-2.5 text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground text-right">Units</th>
                <th class="px-4 py-2.5 text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground text-right w-32">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {#if topProducts.length === 0}
                <tr>
                  <td colspan="4" class="px-4 py-8 text-center text-[12px] text-muted-foreground">No sales data recorded today.</td>
                </tr>
              {:else}
                {#each topProducts as p, i}
                  <tr class="border-b border-border/10 last:border-0 hover:bg-muted/10 transition-colors">
                    <td class="px-4 py-3 text-center">
                      <span class="inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold tabular-nums
                        {i < 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-500' : 'bg-muted/30 text-muted-foreground'}">
                        {i + 1}
                      </span>
                    </td>
                    <td class="px-4 py-3 font-semibold text-[13px] text-foreground truncate max-w-[200px]">{p.name}</td>
                    <td class="px-4 py-3 text-right font-medium text-[12.5px] text-muted-foreground tabular-nums">{p.qty}</td>
                    <td class="px-4 py-3 text-right font-bold text-[12.5px] text-foreground tabular-nums">
                      ${p.revenue.toLocaleString('en-US', {minimumFractionDigits: 2})}
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
        </table>
      </div>
      </div>

      <!-- Low Stock Alerts -->
      {#if lowStockItems.length > 0}
        <div class="surface-card rounded-xl flex flex-col border-destructive/30">
          <div class="px-3 py-3 border-b border-destructive/20 bg-destructive/5 rounded-t-xl flex justify-between items-center">
            <h3 class="text-[11px] font-bold uppercase tracking-wider text-destructive">Low Stock Alerts</h3>
            <a href="/products" class="text-[9px] uppercase tracking-wider text-destructive font-bold hover:bg-destructive/20 bg-destructive/10 px-2 py-0.5 rounded-[4px] transition-colors">Manage</a>
          </div>
          <div class="flex-1 p-0 flex flex-col">
            {#each lowStockItems as item}
              <div class="flex items-center justify-between py-2 px-3 border-b border-border/20 last:border-0 hover:bg-destructive/5 transition-colors">
                <span class="text-[11.5px] font-semibold truncate pr-2">{item.name}</span>
                <span class="tabular font-bold text-[10.5px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-[4px] whitespace-nowrap">
                  {item.qty} left
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Right Column: Inventory & Activity -->
    <div class="flex flex-col gap-4 w-full">
      
      <!-- Inventory Value Stats -->
      <div class="flex flex-col surface-card rounded-xl">
        <div class="px-4 py-3 border-b border-border/30 bg-card/40 rounded-t-xl flex justify-between items-center">
          <div class="flex items-center gap-2">
            <Package size={15} class="text-primary" />
            <h3 class="text-[11.5px] font-bold uppercase tracking-wider text-foreground">Inventory Vault</h3>
          </div>
        </div>
        <div class="p-4 flex flex-col gap-4">
          <div class="flex justify-between items-end pb-4 border-b border-border/50">
            <div>
              <p class="text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Retail Value</p>
              <p class="text-[22px] font-extrabold tabular-nums text-foreground leading-none tracking-tight">
                ${inventoryStats.retailValue.toLocaleString('en-US', {minimumFractionDigits: 2})}
              </p>
            </div>
            <div class="text-right">
              <p class="text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Cost</p>
              <p class="text-[14px] font-bold tabular-nums text-muted-foreground leading-none">
                ${inventoryStats.costValue.toLocaleString('en-US', {minimumFractionDigits: 2})}
              </p>
            </div>
          </div>
          <div class="flex justify-between items-center pt-1">
             <span class="text-[11.5px] font-semibold text-muted-foreground">Est. Margin</span>
             <span class="inline-flex bg-primary/10 text-primary text-[11px] font-extrabold px-2 py-0.5 rounded-full">
               {(inventoryStats.retailValue > 0 ? ((inventoryStats.retailValue - inventoryStats.costValue) / inventoryStats.retailValue) * 100 : 0).toFixed(1)}%
             </span>
          </div>
          <div class="flex justify-between items-center">
             <span class="text-[11.5px] font-semibold text-muted-foreground">Units in stock</span>
             <span class="text-[12px] font-bold tabular-nums">{inventoryStats.totalUnits.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <!-- Recent Transactions -->
      <div class="surface-card rounded-xl flex flex-col">
        <div class="px-3 py-3 border-b border-border/30 flex justify-between items-center bg-card/40 rounded-t-xl">
          <h3 class="text-[11px] font-bold uppercase tracking-wider text-foreground">Recent Transactions</h3>
          <a href="/transactions" class="text-[9px] text-primary font-bold hover:underline flex items-center uppercase tracking-wider">View All <ArrowUpRight size={10} class="ml-0.5"/></a>
        </div>
        <div class="flex-1 p-0 flex flex-col">
          {#if recentTransactions.length === 0}
            <div class="py-4 text-center text-[11px] text-muted-foreground">No recent transactions.</div>
          {:else}
            {#each recentTransactions as tx}
              <div class="flex items-center justify-between py-2.5 px-3 border-b border-border/20 last:border-0 hover:bg-secondary/20 transition-colors">
                <div class="flex flex-col">
                  <span class="text-[11.5px] font-bold leading-tight">{tx.receiptId}</span>
                  <span class="text-[9.5px] text-muted-foreground leading-tight font-medium tracking-wide mt-0.5">{new Date(tx.time).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })} • {tx.method}</span>
                </div>
                <div class="tabular font-bold text-[11.5px]">
                  {tx.amount}
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>

    </div>

  </div>
</div>
