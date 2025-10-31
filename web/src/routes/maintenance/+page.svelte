<script>
  import AuthPageLayout from '$lib/components/layouts/AuthPageLayout.svelte';
  import { Heading } from '@immich/ui';
</script>

<AuthPageLayout>
  <div class="flex flex-col place-items-center text-center gap-4">
    <Heading size="large" color="primary" tag="h1">Temporarily Unavailable</Heading>
    <p>Immich has been put into maintenance mode.</p>
  </div>
</AuthPageLayout>
