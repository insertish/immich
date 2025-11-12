<script lang="ts">
  import AuthPageLayout from '$lib/components/layouts/AuthPageLayout.svelte';
  import { AppRoute } from '$lib/constants';
  import { handleError } from '$lib/utils/handle-error';
  import { Button, Heading, Stack } from '@immich/ui';
  import { t } from 'svelte-i18n';

  function switchToMaintenance() {
    try {
      // special route to start restore flow
    } catch (error) {
      handleError(error, $t('admin.maintenance_start_error'));
    }
  }
</script>

<AuthPageLayout>
  <div class="flex flex-col place-items-center text-center gap-12">
    <Heading size="large" color="primary" tag="h1">{$t('welcome_to_immich')}</Heading>
    <Stack>
      <Button href={AppRoute.AUTH_REGISTER} size="medium" shape="round">
        <span class="px-2 font-semibold">{$t('getting_started')}</span>
      </Button>
      <Button size="medium" shape="round" variant="ghost" onclick={switchToMaintenance}>
        <span class="px-2 font-semibold">Restore from backup</span>
      </Button>
    </Stack>
  </div>
</AuthPageLayout>
