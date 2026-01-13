import { authenticate } from '$lib/utils/auth';
import { getFormatter } from '$lib/utils/i18n';
import { getIntegrityReportSummary, listDatabaseBackups } from '@immich/sdk';
import type { PageLoad } from './$types';

export const load = (async ({ url }) => {
  await authenticate(url, { admin: true });
  const integrityReport = await getIntegrityReportSummary();
  const { backups } = await listDatabaseBackups();
  const $t = await getFormatter();

  return {
    backups,
    integrityReport,
    meta: {
      title: $t('admin.maintenance_settings'),
    },
  };
}) satisfies PageLoad;
