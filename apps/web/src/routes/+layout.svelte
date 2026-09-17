<script lang="ts">
  import '../app.css';
  import { auth } from '$lib/stores/auth.svelte';
  import type { LayoutData } from './$types';
  import { ModeWatcher } from 'mode-watcher';
  
  let { children, data } = $props<{ children: any; data: LayoutData }>();

  // Hydrate auth store dynamically every time the user loads or navigation triggers layout updates
  $effect(() => {
    if (data.user) {
      auth.init(
        {
          id: data.user.id,
          first_name: data.user.email?.split('@')[0] ?? 'User',
          last_name: '',
          email: data.user.email ?? '',
          avatar: data.user.user_metadata?.avatar_url
        },
        data.member ?? null
      );
    } else {
      auth.init(null, null);
    }
  });
</script>

<ModeWatcher defaultMode="system" />

<div class="h-screen w-full font-sans antialiased bg-background text-foreground">
  {@render children()}
</div>
