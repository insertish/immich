import { loadMaintenanceAuth, loadMaintenanceStatus } from '$lib/utils/maintenance';
import type { PageLoad } from '../admin/$types';

export const load = (async () => {
  await Promise.all([loadMaintenanceStatus(), loadMaintenanceAuth()]);
}) satisfies PageLoad;
