<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card";
  import { LogOut, Loader2, ArrowRight, Inbox, Palette, Check } from "lucide-svelte";
  import { goto } from "$app/navigation";
  import Stepper from "$lib/components/ui/stepper.svelte";
  
  let { data } = $props<{ data: any }>();
  
  const STEPS = [
    { slug: 'shop',       label: 'Shop'       },
    { slug: 'locale',     label: 'Currency'   },
    { slug: 'appearance', label: 'Look'       },
    { slug: 'team',       label: 'Team'       },
    { slug: 'categories', label: 'Categories' },
    { slug: 'complete',   label: 'Done'       },
  ];

  let currentStep = $state('shop');

  // Payload states
  let name = $state("");
  let slug = $state("");
  let countryCode = $state("US");
  let currencyCode = $state("USD");
  // Appearance defaults
  let theme = $state("system");
  let primaryColor = $state("#000000");
  
  let isLoading = $state(false);
  let errorMessage = $state("");

  // categories step data
  let categoriesData = $state([
    { name: 'Skincare', icon: 'Tag', color: '#7B4F8A' },
    { name: 'Makeup', icon: 'Tag', color: '#C03868' }
  ]);

  let generatedShopId = $state("");

  $effect(() => {
    if (name && currentStep === 'shop') {
      slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }
  });

  async function nextStep() {
    errorMessage = "";
    if (currentStep === 'shop') {
      if (!name || !slug) return;
      currentStep = 'locale';
    } 
    else if (currentStep === 'locale') {
      isLoading = true;
      try {
        // We accumulate everything in one shop creation step here
        const resp = await data.client.shops.$post({
          json: {
            name,
            slug,
            countryCode,
            currencyCode
          }
        });
        if (resp.ok) {
          const body = await resp.json();
          if (body.success) {
            generatedShopId = body.data.id;
            currentStep = 'appearance';
          } else {
            errorMessage = body.error || "Failed to create shop.";
          }
        } else {
          const errResp = await resp.json().catch(()=>({}));
          errorMessage = errResp.error || "A server error occurred.";
        }
      } catch (e: any) {
         errorMessage = e.message || "Network error. Please try again.";
      } finally {
        isLoading = false;
      }
    }
    else if (currentStep === 'appearance') {
      isLoading = true;
      try {
        await data.client.shops[":id"].$patch({
          param: { id: generatedShopId },
          json: { theme, primaryColor, onboardingStep: 'team' }
        });
      } catch (e) {
         // Silently fallback if appearance patch fails
      } finally {
        isLoading = false;
        currentStep = 'team';
      }
    }
    else if (currentStep === 'team') {
      currentStep = 'categories';
    }
    else if (currentStep === 'categories') {
      isLoading = true;
      try {
        const validCategories = categoriesData.filter(c => c.name.trim());
        for (const cat of validCategories) {
          await data.client.categories.$post({
            json: {
              shopId: generatedShopId,
              name: cat.name,
              icon: cat.icon,
              color: cat.color,
            }
          });
        }
        await data.client.shops[":id"].$patch({
          param: { id: generatedShopId },
          json: { onboardingComplete: true, onboardingStep: 'complete' }
        });
      } catch(e) {
         // Ignore
      } finally {
        isLoading = false;
        currentStep = 'complete';
        setTimeout(() => goto("/dashboard"), 800);
      }
    }
  }

  async function handleLogout() {
    await data.supabase.auth.signOut();
    await goto("/login");
  }

  const slugPreview = $derived(slug ? `shelf.app/${slug}` : null);
</script>

<div class="min-h-screen bg-muted/40 flex flex-col items-center justify-center p-4">
  <div class="w-full max-w-md space-y-6">
    <div class="text-center space-y-2 mb-6">
      <div class="inline-flex items-center justify-center space-x-2 font-bold text-2xl tracking-tight">
        <div class="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
          S
        </div>
        <span>Shëlf<span class="text-primary">.</span></span>
      </div>
    </div>

    <Stepper steps={STEPS} current={currentStep} />

    <Card class="border-2 fade-in slide-in-from-bottom-2 duration-300">
      
      {#if currentStep === 'shop'}
        <form onsubmit={(e) => { e.preventDefault(); nextStep(); }}>
          <CardHeader>
            <CardTitle>Name your shop</CardTitle>
            <CardDescription>You can change this anytime in settings.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <Label for="name">Shop name</Label>
              <Input id="name" placeholder="e.g. Glam Studio" bind:value={name} disabled={isLoading} required />
            </div>
            <div class="space-y-2">
              <Label for="slug">Shop handle</Label>
              <Input id="slug" bind:value={slug} disabled={isLoading} required pattern="^[a-z0-9-]+$" />
              <p class="text-xs text-muted-foreground">{slugPreview ? `Your shop will be at ${slugPreview}` : 'Used in your URL. Letters, numbers, and hyphens only.'}</p>
            </div>
            {#if errorMessage}
              <div class="p-3 bg-destructive/10 text-destructive rounded-md text-sm border font-medium text-center">{errorMessage}</div>
            {/if}
          </CardContent>
          <CardFooter class="flex flex-col space-y-4">
            <Button type="submit" class="w-full" disabled={isLoading || !name || !slug}>
              Continue <ArrowRight class="ml-2 w-4 h-4"/>
            </Button>
            <Button variant="ghost" type="button" class="text-muted-foreground gap-2 w-full" onclick={handleLogout} disabled={isLoading}>
              <LogOut class="w-4 h-4" /> Sign out
            </Button>
          </CardFooter>
        </form>

      {:else if currentStep === 'locale'}
        <form onsubmit={(e) => { e.preventDefault(); nextStep(); }}>
          <CardHeader>
            <CardTitle>Where are you based?</CardTitle>
            <CardDescription>Setup your shop's region and currency.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <Label>Country</Label>
              <select bind:value={countryCode} class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="US">United States</option>
                <option value="IN">India</option>
                <option value="UK">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
              </select>
            </div>
             <div class="space-y-2">
              <Label>Currency</Label>
              <select bind:value={currencyCode} class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>
            {#if errorMessage}
              <div class="p-3 bg-destructive/10 text-destructive rounded-md text-sm border font-medium text-center">{errorMessage}</div>
            {/if}
          </CardContent>
          <CardFooter>
            <Button type="submit" class="w-full" disabled={isLoading}>
              {#if isLoading}<Loader2 class="mr-2 h-4 w-4 animate-spin" />{/if}
              Create Shop <ArrowRight class="ml-2 w-4 h-4"/>
            </Button>
          </CardFooter>
        </form>

      {:else if currentStep === 'appearance'}
        <form onsubmit={(e) => { e.preventDefault(); nextStep(); }}>
          <CardHeader>
            <CardTitle>Pick your style</CardTitle>
            <CardDescription>What color should your dashboard be?</CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <div class="space-y-2">
              <Label>Theme Preference</Label>
              <div class="flex gap-2">
                <Button type="button" variant={theme === 'light' ? 'default' : 'outline'} onclick={() => theme = 'light'} class="flex-1">Light</Button>
                <Button type="button" variant={theme === 'dark' ? 'default' : 'outline'} onclick={() => theme = 'dark'} class="flex-1">Dark</Button>
                <Button type="button" variant={theme === 'system' ? 'default' : 'outline'} onclick={() => theme = 'system'} class="flex-1">System</Button>
              </div>
            </div>
            <div class="space-y-2">
              <Label>Brand Color Accent</Label>
              <div class="flex gap-2">
                {#each ['#000000', '#0f172a', '#b91c1c', '#047857', '#1d4ed8'] as color}
                  <button type="button" aria-label="Select color {color}" class="w-10 h-10 rounded-full border-2 transition-all {primaryColor === color ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background' : 'border-border'}" style="background-color: {color};" onclick={() => primaryColor = color}></button>
                {/each}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" class="w-full" disabled={isLoading}>
              Continue <ArrowRight class="ml-2 w-4 h-4"/>
            </Button>
          </CardFooter>
        </form>

      {:else if currentStep === 'team'}
        <CardHeader>
          <CardTitle>Your team</CardTitle>
          <CardDescription>Other shop owners may have invited you.</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex flex-col items-center py-6 text-center">
            <div class="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-primary/10 text-primary">
              <Inbox size={20} strokeWidth={1.75} />
            </div>
            <p class="text-sm font-semibold">No pending invites</p>
            <p class="text-xs text-muted-foreground mt-1 max-w-[260px]">
              You're all set. Continue to set up your own shop categories.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onclick={nextStep} class="w-full" disabled={isLoading}>
            Skip — continue setup <ArrowRight class="ml-2 w-4 h-4"/>
          </Button>
        </CardFooter>

      {:else if currentStep === 'categories'}
        <form onsubmit={(e) => { e.preventDefault(); nextStep(); }}>
          <CardHeader>
            <CardTitle>Set up categories</CardTitle>
            <CardDescription>Organise your inventory. Add presets.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
             {#each categoriesData as cat}
               <div class="flex items-center gap-2 p-2 border rounded-lg bg-muted/40">
                 <div class="w-8 h-8 rounded shrink-0 flex items-center justify-center p-1" style="background-color: {cat.color}20">
                   <Palette class="w-4 h-4" style="color: {cat.color}" />
                 </div>
                 <Input bind:value={cat.name} class="h-8 py-1 px-2" placeholder="Category name" />
               </div>
             {/each}
             <Button variant="outline" size="sm" type="button" class="w-full border-dashed" onclick={() => { categoriesData.push({ name: '', icon: 'Tag', color: '#64748B' }); }}>
                + Add category
             </Button>
          </CardContent>
          <CardFooter>
            <Button type="submit" class="w-full" disabled={isLoading}>
              {#if isLoading}<Loader2 class="mr-2 h-4 w-4 animate-spin" />{/if}
              Finish setup <ArrowRight class="ml-2 w-4 h-4"/>
            </Button>
          </CardFooter>
        </form>

      {:else if currentStep === 'complete'}
        <CardContent class="py-12 flex flex-col items-center text-center space-y-4">
          <div class="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center mb-2">
            <Check size={32} strokeWidth={3} />
          </div>
          <CardTitle class="text-2xl">You're all set!</CardTitle>
          <CardDescription>Bringing you to your new dashboard...</CardDescription>
          <Loader2 class="w-6 h-6 animate-spin text-muted-foreground mt-4" />
        </CardContent>
      {/if}
    </Card>
  </div>
</div>