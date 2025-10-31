<script lang="ts">
  import { enableMaintenanceMode } from '@immich/sdk';
  import { Button } from '@immich/ui';
  import { t } from 'svelte-i18n';
  import { fade } from 'svelte/transition';

  interface Props {
    disabled?: boolean;
  }

  let { disabled = false }: Props = $props();

  async function enable() {
    await enableMaintenanceMode();
    // => reload the page
  }
</script>

<div>
  <div in:fade={{ duration: 500 }}>
    <div class="mt-4 flex justify-between gap-2">
      <Button shape="round" {disabled} size="small" onclick={enable}>{$t('enable')}</Button>
    </div>
  </div>
</div>
