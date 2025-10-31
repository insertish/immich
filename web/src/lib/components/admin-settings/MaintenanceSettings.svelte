<script lang="ts">
  import { isMaintenanceMode, setMaintenanceMode } from '@immich/sdk';
  import { Button } from '@immich/ui';
  import { t } from 'svelte-i18n';
  import { fade } from 'svelte/transition';

  interface Props {
    disabled?: boolean;
  }

  let { disabled = false }: Props = $props();

  async function enable() {
    await setMaintenanceMode({
      setMaintenanceModeDto: {
        enabled: true,
      },
    });

    // todo: 'please wait' or something in UI

    const timer = setInterval(() => {
      isMaintenanceMode()
        .then(({ enabled }) => {
          if (enabled) {
            location.href = '/maintenance';
          }

          clearInterval(timer);
        })
        .catch((_) => {});
    }, 1000);
  }
</script>

<div>
  <div in:fade={{ duration: 500 }}>
    <div class="mt-4 flex justify-between gap-2">
      <Button shape="round" {disabled} size="small" onclick={enable}>{$t('enable')}</Button>
    </div>
  </div>
</div>
