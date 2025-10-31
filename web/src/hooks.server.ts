import overpass from '$lib/assets/fonts/overpass/Overpass.ttf?url';
import overpassMono from '$lib/assets/fonts/overpass/OverpassMono.ttf?url';
import { redirect, type Handle } from '@sveltejs/kit';

// only used during the build to replace the variables from app.html
export const handle = (async ({ event, resolve }) => {
  const { enabled: maintenanceMode } = await fetch(process.env.IMMICH_SERVER_URL + 'api/system-config/maintenance-mode')
    .then((response) => response.json())
    .catch((_) => ({ enabled: false }));

  console.info('check maintain', maintenanceMode);

  if (maintenanceMode && !event.url.pathname.startsWith('/maintenance')) {
    throw redirect(302, '/maintenance');
  }

  return resolve(event, {
    transformPageChunk: ({ html }) => {
      return html.replace('%app.font%', overpass).replace('%app.monofont%', overpassMono);
    },
  });
}) satisfies Handle;
