<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Plus, Tag, Trash2, Loader2, Palette } from "lucide-svelte";
  import { toast } from "$lib/utils/toast";

  let { data } = $props<{ data: any }>();

  let categories = $state<any[]>(data.categories ?? []);
  let showDialog = $state(false);
  let editingId = $state<string | null>(null);
  let categoryName = $state("");
  let categoryColor = $state("#6366f1");
  let isSaving = $state(false);
  let saveError = $state<string | null>(null);

  const colorPalette = [
    "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
    "#f97316", "#eab308", "#22c55e", "#14b8a6",
    "#06b6d4", "#3b82f6", "#6b7280", "#78716c",
  ];

  function productCount(categoryId: string): number {
    if (!data.products) return 0;
    return data.products.filter((p: any) => p.categoryId === categoryId).length;
  }

  async function handleSave(e: Event) {
    e.preventDefault();
    if (!categoryName.trim()) return;
    isSaving = true;
    saveError = null;

    try {
      if (editingId) {
        const resp = await data.client.categories[":id"].$patch({
          param: { id: editingId },
          json: { name: categoryName.trim(), color: categoryColor },
        });
        if (resp.ok) {
          categories = categories.map((c: any) => c.id === editingId ? { ...c, name: categoryName.trim(), color: categoryColor } : c);
          toast.success("Category updated!");
          showDialog = false;
        } else { const body = await resp.json(); saveError = (body as any).error || "Failed to update."; }
      } else {
        const resp = await data.client.categories.$post({
          json: { shopId: data.activeShop.id, name: categoryName.trim(), color: categoryColor },
        });
        if (resp.ok) {
          const saved = await resp.json();
          const c = (saved as any).category ?? (saved as any).data ?? saved;
          categories = [...categories, { id: c?.id ?? crypto.randomUUID(), name: categoryName.trim(), color: categoryColor }];
          toast.success("Category created!");
          showDialog = false;
        } else { const body = await resp.json(); saveError = (body as any).error || "Failed to create."; }
      }
    } catch (e: any) {
      saveError = e.message || "Network error.";
    } finally {
      isSaving = false;
    }
  }

  function openCreate() {
    editingId = null; categoryName = ""; categoryColor = "#6366f1"; saveError = null; showDialog = true;
  }
  function openEdit(cat: any) {
    editingId = cat.id; categoryName = cat.name; categoryColor = cat.color || "#6366f1"; saveError = null; showDialog = true;
  }
  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Products will become uncategorized.")) return;
    const resp = await data.client.categories[":id"].$delete({ param: { id } });
    if (resp.ok) { categories = categories.filter((c: any) => c.id !== id); toast.success("Category deleted."); }
  }
</script>

<div class="space-y-6">
  <div class="surface-card rounded-xl border border-border/40 overflow-hidden">
    <!-- Header -->
    <div class="px-5 py-4 border-b border-border/30 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
          <Tag size={16} class="text-rose-500" />
        </div>
        <div>
          <h2 class="text-[14px] font-bold text-foreground">Categories</h2>
          <p class="text-[11px] text-muted-foreground">{categories.length} categor{categories.length === 1 ? 'y' : 'ies'} total</p>
        </div>
      </div>
      <Button onclick={openCreate} class="h-8 px-4 rounded-lg text-[11px] font-bold gap-1.5">
        <Plus size={14} /> Add Category
      </Button>
    </div>

    <!-- Category list -->
    {#if categories.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <div class="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
          <Tag size={20} />
        </div>
        <p class="text-[13px] font-semibold">No categories yet</p>
        <p class="text-[11px] mt-1 mb-4">Create one to organize your products.</p>
        <Button onclick={openCreate} class="h-8 px-4 rounded-lg text-[11px] font-bold gap-1.5">
          <Plus size={14} /> Create Category
        </Button>
      </div>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/30">
        {#each categories as cat (cat.id)}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            onclick={() => openEdit(cat)}
            class="group relative bg-background hover:bg-secondary/30 transition-all p-4 text-left cursor-pointer"
          >
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style="background: {cat.color || '#6366f1'}20">
                <Tag size={14} style="color: {cat.color || '#6366f1'}" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[13px] font-bold text-foreground truncate">{cat.name}</p>
                <p class="text-[10px] text-muted-foreground mt-0.5">{productCount(cat.id)} products</p>
              </div>
              <button
                type="button"
                onclick={(e) => { e.stopPropagation(); handleDelete(cat.id); }}
                class="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
            <!-- Color bar -->
            <div class="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style="background: {cat.color || '#6366f1'}"></div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Dialog -->
{#if showDialog}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="w-full max-w-md rounded-xl border border-border/50 bg-background p-6 shadow-2xl">
      <h2 class="text-[15px] font-bold text-foreground mb-4">
        {editingId ? "Edit Category" : "New Category"}
      </h2>
      {#if saveError}
        <div class="mb-4 rounded-lg bg-destructive/10 p-3 text-[12px] text-destructive border border-destructive/20">{saveError}</div>
      {/if}
      <form onsubmit={handleSave} class="space-y-4">
        <div class="space-y-1.5">
          <Label for="cat-name" class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Name</Label>
          <Input id="cat-name" placeholder="e.g. Electronics" bind:value={categoryName} disabled={isSaving} required autofocus class="h-10 rounded-lg bg-muted/20 text-[13px]" />
        </div>
        <div class="space-y-1.5">
          <Label class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Color</Label>
          <div class="grid grid-cols-6 gap-2">
            {#each colorPalette as color}
              <button type="button" aria-label="Color {color}"
                class="h-8 w-8 rounded-lg border-2 transition-all {categoryColor === color ? 'border-foreground scale-110 shadow-md' : 'border-transparent hover:scale-105'}"
                style="background-color: {color}" onclick={() => (categoryColor = color)}
              ></button>
            {/each}
          </div>
          <div class="flex items-center gap-2 mt-2">
            <Palette size={14} class="text-muted-foreground" />
            <input type="color" bind:value={categoryColor} class="h-6 w-6 rounded cursor-pointer border-0 p-0" />
            <span class="text-[11px] text-muted-foreground font-mono">{categoryColor}</span>
          </div>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onclick={() => (showDialog = false)} disabled={isSaving} class="h-9 px-4 rounded-lg text-[12px] font-bold">Cancel</Button>
          <Button type="submit" disabled={isSaving || !categoryName.trim()} class="h-9 px-5 rounded-lg text-[12px] font-bold">
            {#if isSaving}<Loader2 class="mr-2 h-3.5 w-3.5 animate-spin" />{/if}
            {editingId ? "Save Changes" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}
