<script lang="ts">
  import AdminPageLayout from '$lib/components/layouts/AdminPageLayout.svelte';
  import SettingAccordionState from '$lib/components/shared-components/settings/setting-accordion-state.svelte';
  import SettingAccordion from '$lib/components/shared-components/settings/setting-accordion.svelte';
  import { QueryParameter } from '$lib/constants';
  import { handleError } from '$lib/utils/handle-error';
  import { restoreBackup, startMaintenance } from '@immich/sdk';
  import { Button, Card, CardBody, HStack, Stack, Text } from '@immich/ui';
  import { mdiProgressWrench, mdiRefresh } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  async function switchToMaintenance() {
    try {
      await startMaintenance();
    } catch (error) {
      handleError(error, $t('admin.maintenance_start_error'));
    }
  }

  async function restore(filename: string) {
    try {
      await restoreBackup({
        maintenanceRestoreBackupDto: {
          backup: filename,
        },
      });
    } catch (error) {
      handleError(error, $t('admin.maintenance_start_error'));
    }
  }
</script>

<AdminPageLayout title={data.meta.title}>
  {#snippet buttons()}
    <HStack gap={1}>
      <Button
        leadingIcon={mdiProgressWrench}
        size="small"
        variant="ghost"
        color="secondary"
        onclick={switchToMaintenance}
      >
        <Text class="hidden md:block">Switch to maintenance mode</Text>
      </Button>
    </HStack>
  {/snippet}

  <section id="setting-content" class="flex place-content-center sm:mx-4">
    <section class="w-full pb-28 sm:w-5/6 md:w-[850px]">
      <SettingAccordionState queryParam={QueryParameter.IS_OPEN}>
        <!-- {#each filteredSettings as { component: Component, title, subtitle, key, icon } (key)}
              <SettingAccordion {title} {subtitle} {key} {icon}>
                <Component
                  onSave={(config) => adminSettingElement?.handleSave(config)}
                  onReset={(options) => adminSettingElement?.handleReset(options)}
                  disabled={$featureFlags.configFile}
                  bind:config
                  {defaultConfig}
                  {savedConfig}
                />
              </SettingAccordion>
            {/each} -->

        <SettingAccordion
          title="Restore database backup"
          subtitle="Rollback to an earlier database state using a backup file"
          icon={mdiRefresh}
          key="backups"
        >
          <Stack gap={2} class="mt-4">
            {#each data.backups as backup (backup.filename)}
              <Card>
                <CardBody>
                  <HStack>
                    <Stack class="flex-grow">
                      <Text>{backup.filename}</Text>
                      {#if backup.daysAgo === 0}
                        <Text color="info" size="small">Created within the past day</Text>
                      {:else if backup.daysAgo === 1}
                        <Text color="info" size="small">Created 1 day ago</Text>
                      {:else if backup.daysAgo}
                        <Text color="info" size="small">Created {backup.daysAgo} days ago</Text>
                      {/if}
                    </Stack>
                    <Button size="small" onclick={() => restore(backup.filename)}>Restore</Button>
                  </HStack>
                </CardBody>
              </Card>
            {/each}
          </Stack>
        </SettingAccordion>
      </SettingAccordionState>
    </section>
  </section>
</AdminPageLayout>
