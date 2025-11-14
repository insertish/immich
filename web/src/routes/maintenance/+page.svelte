<script lang="ts">
  import AuthPageLayout from '$lib/components/layouts/AuthPageLayout.svelte';
  import MaintenanceBackupsList from '$lib/components/maintenance/MaintenanceBackupsList.svelte';
  import FormatMessage from '$lib/elements/FormatMessage.svelte';
  import { maintenanceStore } from '$lib/stores/maintenance.store';
  import { handleError } from '$lib/utils/handle-error';
  import { MaintenanceAction, setMaintenanceMode } from '@immich/sdk';
  import { Button, Heading, Link, Scrollable, Text } from '@immich/ui';
  import { t } from 'svelte-i18n';

  // strip token from URL after load
  const url = new URL(location.href);
  if (url.searchParams.get('token')) {
    url.searchParams.delete('token');
    history.replaceState({}, document.title, url);
  }

  async function end() {
    try {
      await setMaintenanceMode({
        setMaintenanceModeDto: {
          action: MaintenanceAction.End,
        },
      });
    } catch (error) {
      handleError(error, $t('maintenance_end_error'));
    }
  }

  const { auth, status } = maintenanceStore;
</script>

<AuthPageLayout title={$t('maintenance_title')} withHeader={!$status.operation}>
  <div class="flex flex-col place-items-center text-center gap-4">
    {#if $status.operation === 'restore-database'}
      <Heading size="large" color="primary" tag="h1">Restoring Database</Heading>
      {#if $status.error}
        <Scrollable>
          <pre class="text-left"><code>{$status.error}</code></pre>
        </Scrollable>
      {:else}
        <div class="w-[240px] h-[10px] bg-gray-300 rounded-full overflow-hidden">
          <div
            class="h-full bg-blue-600 transition-all duration-700"
            style="width: {($status.progress || 0) * 100}%"
          ></div>
        </div>
        {#if $status.action}
          <Text>{$t(`maintenance_operation_${$status.action as 'backup' | 'restore'}`)}</Text>
        {/if}
      {/if}
    {:else if $status.operation === 'restore-database-flow'}
      <Heading size="large" color="primary" tag="h1">Restore From Backup</Heading>
      <Scrollable class="max-h-[320px]">
        <MaintenanceBackupsList />
      </Scrollable>
      <Button onclick={end}>Cancel</Button>
    {:else}
      <p>
        <FormatMessage key="maintenance_description">
          {#snippet children({ tag, message })}
            {#if tag === 'link'}
              <Link href="https://docs.immich.app/administration/maintenance-mode">
                {message}
              </Link>
            {/if}
          {/snippet}
        </FormatMessage>
      </p>
      {#if $auth}
        <p>
          {$t('maintenance_logged_in_as', {
            values: {
              user: $auth.username,
            },
          })}
        </p>
      {/if}
    {/if}
    {#if $auth && (!$status.operation || $status.error)}
      <Button onclick={end}>{$t('maintenance_end')}</Button>
    {/if}
  </div>
</AuthPageLayout>
