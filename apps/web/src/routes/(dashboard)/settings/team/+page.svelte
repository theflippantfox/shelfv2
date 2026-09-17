<script lang="ts">
  import { toast } from "$lib/utils/toast";
  import { Shield, Mail, UserPlus, Users, Trash2, ChevronDown, X } from "lucide-svelte";

  let { data }: { data: any } = $props();

  let members = $state<any[]>(data.members ?? []);
  let showInvite = $state(false);
  let inviteEmail = $state("");
  let inviteRole = $state("cashier");
  let inviting = $state(false);

  function getRoleBadgeColor(role: string) {
    if (role === "owner") return "bg-primary/10 text-primary";
    if (role === "admin") return "bg-amber-500/10 text-amber-500";
    return "bg-muted text-muted-foreground";
  }

  const ROLE_LABELS: Record<string, string> = {
    owner: "Full access — can manage everything",
    admin: "Can manage products, inventory, and team",
    cashier: "Can process sales and view products",
    inventory: "Can manage stock and products only",
  };

  async function inviteMember() {
    if (!inviteEmail.trim() || inviting) return;
    const activeShop = data.activeShop;
    if (!activeShop) return;
    inviting = true;
    try {
      const resp = await data.client.team.invite.$post({
        json: { shopId: activeShop.id, email: inviteEmail.trim(), role: inviteRole },
      });
      const body = await resp.json();
      if (resp.ok) {
        toast.success(`Invitation sent to ${inviteEmail}`);
        showInvite = false;
        inviteEmail = "";
        inviteRole = "cashier";
        // Refresh by reloading
        window.location.reload();
      } else {
        toast.error((body as any).error || "Failed to invite member");
      }
    } catch {
      toast.error("Failed to invite member");
    } finally {
      inviting = false;
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this team member?")) return;
    try {
      const resp = await data.client.team[`:any`].$delete({ param: { id: memberId } });
      if (resp.ok) {
        members = members.filter((m) => m.id !== memberId);
        toast.success("Member removed");
      } else {
        const body = await resp.json();
        toast.error((body as any).error || "Failed to remove member");
      }
    } catch {
      toast.error("Failed to remove member");
    }
  }

  async function changeRole(memberId: string, newRole: string) {
    try {
      const resp = await data.client.team[`:any`].role.$patch({
        param: { id: memberId },
        json: { role: newRole },
      });
      if (resp.ok) {
        members = members.map((m) => m.id === memberId ? { ...m, role: newRole } : m);
        toast.success("Role updated");
      }
    } catch {
      toast.error("Failed to update role");
    }
  }
</script>

<div class="space-y-6">
  <!-- Header card -->
  <div class="surface-card rounded-xl border border-border/40 overflow-hidden">
    <div class="px-5 py-4 border-b border-border/30 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users size={16} class="text-primary" />
        </div>
        <div>
          <h2 class="text-[14px] font-bold text-foreground">Team Members</h2>
          <p class="text-[11px] text-muted-foreground">{members.length} member{members.length !== 1 ? 's' : ''} · {data.activeShop.name}</p>
        </div>
      </div>
      <button class="btn-primary h-8" onclick={() => showInvite = true}>
        <UserPlus size={14} /> Invite Member
      </button>
    </div>

    <!-- Members list -->
    {#if members.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <div class="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
          <Users size={20} />
        </div>
        <p class="text-[13px] font-semibold">No team members</p>
        <p class="text-[11px] mt-1">Invite staff to join your workspace.</p>
      </div>
    {:else}
      {#each members as member, i (member.id)}
        {@const isOwner = member.userId === data.activeShop.ownerId}
        <div class="flex items-center gap-4 px-5 py-3.5 {i < members.length - 1 ? 'border-b border-border/30' : ''}">
          <!-- Avatar -->
          <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span class="text-[13px] font-bold text-primary">{member.profile?.firstName?.[0] || "U"}</span>
          </div>
          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="text-[13px] font-bold text-foreground truncate">
              {member.profile?.firstName ?? "Unknown"} {member.profile?.lastName ?? ""}
            </p>
            <p class="text-[10px] text-muted-foreground">{ROLE_LABELS[member.role] ?? member.role}</p>
          </div>
          <!-- Role badge -->
          {#if isOwner}
            <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold {getRoleBadgeColor(member.role)} capitalize shrink-0">
              <Shield size={10} class="mr-1" /> {member.role}
            </span>
          {:else}
            <div class="relative shrink-0">
              <select
                class="appearance-none bg-transparent text-[10px] font-bold rounded-full px-2.5 py-0.5 pr-5 border border-border/40 {getRoleBadgeColor(member.role)} capitalize cursor-pointer"
                value={member.role}
                onchange={(e) => changeRole(member.id, (e.target as HTMLSelectElement).value)}
              >
                <option value="admin">Admin</option>
                <option value="cashier">Cashier</option>
                <option value="inventory">Inventory</option>
              </select>
              <ChevronDown size={10} class="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          {/if}
          <!-- Status -->
          <span class="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 shrink-0">Active</span>
          <!-- Remove -->
          {#if !isOwner}
            <button class="p-1.5 rounded-md hover:bg-rose-500/10 transition-colors shrink-0" onclick={() => removeMember(member.id)}>
              <Trash2 size={13} class="text-rose-500" />
            </button>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <!-- Role descriptions -->
  <div class="surface-card rounded-xl border border-border/40 p-5">
    <h3 class="text-[13px] font-bold text-foreground mb-3">Role Permissions</h3>
    <div class="space-y-2">
      {#each Object.entries(ROLE_LABELS) as [role, desc]}
        {#if role !== 'owner'}
          <div class="flex items-center gap-3 py-1.5">
            <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold {getRoleBadgeColor(role)} capitalize shrink-0">
              {#if role === 'admin'}<Shield size={10} class="mr-1" />{/if}
              {role}
            </span>
            <span class="text-[11px] text-muted-foreground">{desc}</span>
          </div>
        {/if}
      {/each}
    </div>
  </div>
</div>

<!-- ── INVITE DIALOG ────────────────────────────────────────── -->
{#if showInvite}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
    <div class="bg-background border border-border/40 rounded-xl w-full max-w-md mx-4 p-6 animate-scale-in">
      <div class="flex items-center justify-between mb-5">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10">
            <Mail size={15} class="text-primary" />
          </div>
          <h3 class="text-[16px] font-bold">Invite Team Member</h3>
        </div>
        <button onclick={() => showInvite = false} class="p-1 rounded-md hover:bg-secondary"><X size={16} /></button>
      </div>

      <div class="space-y-3">
        <div>
          <label class="text-[11px] font-bold text-muted-foreground mb-1 block">Email Address *</label>
          <input class="input-field" type="email" bind:value={inviteEmail} placeholder="colleague@example.com" />
          <p class="text-[10px] text-muted-foreground mt-1">They must already have a Shelf account to be invited.</p>
        </div>
        <div>
          <label class="text-[11px] font-bold text-muted-foreground mb-1 block">Role *</label>
          <select class="input-field" bind:value={inviteRole}>
            <option value="cashier">Cashier — Process sales, view products</option>
            <option value="admin">Admin — Manage products, inventory, and team</option>
            <option value="inventory">Inventory — Manage stock and products only</option>
          </select>
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-5">
        <button class="btn-secondary" onclick={() => showInvite = false}>Cancel</button>
        <button class="btn-primary" onclick={inviteMember} disabled={!inviteEmail.trim() || inviting}>
          {#if inviting}Sending…{:else}<UserPlus size={14} /> Send Invite{/if}
        </button>
      </div>
    </div>
  </div>
{/if}
