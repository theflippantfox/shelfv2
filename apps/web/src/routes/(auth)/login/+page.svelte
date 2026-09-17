<script lang="ts">
  import { Store, Loader2, Mail } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  let { data } = $props<{ data: any }>();

  // State management using Svelte 5 runes
  let email = $state('');
  let password = $state('');
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    isLoading = true;
    error = null;

    try {
      const { error: signInError } = await data.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        error = signInError.message;
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      error = err.message || "Authentication failed.";
    } finally {
      isLoading = false;
    }
  };
</script>

<div class="flex min-h-screen items-center justify-center bg-muted/40 p-4">
  <div class="relative w-full max-w-sm rounded-2xl border border-border/50 bg-background px-8 py-10 shadow-xl backdrop-blur-xl">
    
    <!-- Branding -->
    <div class="mb-8 flex flex-col items-center space-y-3">
      <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Store size={24} strokeWidth={2.5} />
      </div>
      <div class="text-center">
        <h1 class="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
        <p class="text-sm text-muted-foreground mt-1">Enter your credentials to access your store.</p>
      </div>
    </div>

    <!-- Error Banner -->
    {#if error}
      <div class="mb-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 text-center font-medium">
        {error}
      </div>
    {/if}

    <!-- Login Form -->
    <form onsubmit={handleLogin} class="space-y-4">
      <div class="space-y-2">
        <Label for="email">Email</Label>
        <div class="relative">
          <Mail class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" size={16} />
          <Input 
            id="email" 
            type="email" 
            placeholder="name@example.com" 
            bind:value={email}
            disabled={isLoading}
            required 
            class="pl-9 bg-accent/20"
          />
        </div>
      </div>

      <div class="space-y-2 pt-2">
        <div class="flex items-center justify-between">
          <Label for="password">Password</Label>
          <a href="/login" class="text-xs font-medium text-primary hover:underline">Forgot password?</a>
        </div>
        <Input 
          id="password" 
          type="password" 
          placeholder="••••••••" 
          bind:value={password}
          disabled={isLoading}
          required 
          class="bg-accent/20"
        />
      </div>

      <Button type="submit" class="w-full mt-6 h-10 font-medium tracking-wide shadow-sm" disabled={isLoading}>
        {#if isLoading}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        Sign In
      </Button>
    </form>

    <div class="mt-8 text-center text-sm text-muted-foreground">
      Don't have a store yet? 
      <a href="/login" class="font-medium text-primary hover:underline ml-1">Contact Sales</a>
    </div>

  </div>
</div>
