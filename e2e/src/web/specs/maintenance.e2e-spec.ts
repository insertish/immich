import { LoginResponseDto } from '@immich/sdk';
import { expect, test } from '@playwright/test';
import { utils } from 'src/utils';

test.describe.configure({ mode: 'serial' });

test.describe('Maintenance', () => {
  let cookie: string | undefined;
  let admin: LoginResponseDto;

  test.beforeAll(async () => {
    utils.initSdk();
    await utils.resetDatabase();
    admin = await utils.adminSetup();
  });

  test('enable maintenance mode', async ({ context, page }) => {
    await utils.setAuthCookies(context, admin.accessToken);

    await page.goto('/admin/system-settings?isOpen=maintenance');
    await page.getByRole('button', { name: 'Start maintenance mode' }).click();

    await page.waitForURL('/maintenance?**');
    await expect(page.getByText('Temporarily Unavailable')).toBeVisible();

    const cookies = await context.cookies(page.url());
    cookie = cookies.find(({ name }) => name === 'immich_maintenance_token')?.value;
    expect(cookie).toBeTruthy();
  });

  test('other users see maintenance mode but no options', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('/maintenance?**');
    await expect(page.getByText('Temporarily Unavailable')).toBeVisible();
    await expect(page.getByRole('button', { name: 'End maintenance mode' })).toHaveCount(0);
  });

  test('we can authenticate by setting token in URL', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('/maintenance?**');
    await expect(page.getByText('Temporarily Unavailable')).toBeVisible();
    await expect(page.getByRole('button', { name: 'End maintenance mode' })).toHaveCount(0);

    await page.goto(`/maintenance?${new URLSearchParams({ token: cookie! })}`);
    await expect(page.getByRole('button', { name: 'End maintenance mode' })).toBeVisible();
  });

  test('disable maintenance mode', async ({ context, page }) => {
    await utils.setAuthCookies(context, admin.accessToken);
    await utils.setMaintenanceAuthCookie(context, cookie!);

    await page.goto('/');
    await page.waitForURL('/maintenance?**');

    await page.getByRole('button', { name: 'End maintenance mode' }).click();
    await page.waitForURL('/photos');
  });

  test('redirect users back to what they were doing', async ({ context, page }) => {
    await utils.setAuthCookies(context, admin.accessToken);

    await page.goto('/admin/system-settings?isOpen=maintenance');
    await page.getByRole('button', { name: 'Start maintenance mode' }).click();
    await page.waitForURL('/maintenance?**');

    await page.goto('/explore');
    await page.waitForURL(`/maintenance?${new URLSearchParams({ continue: '/explore' })}`);
    await page.getByRole('button', { name: 'End maintenance mode' }).click();
    await page.waitForURL('/explore');
  });

  /**
   * restoring backups
   */

  test('restore a backup from settings', async ({ context, page }) => {
    await utils.resetBackups(admin.accessToken);
    await utils.createBackup(admin.accessToken);
    await utils.setAuthCookies(context, admin.accessToken);

    await page.goto('/admin/maintenance?isOpen=backups');
    await page.getByRole('button', { name: 'Restore', exact: true }).click();
    await page.locator('#bits-c2').getByRole('button', { name: 'Restore' }).click();

    await page.waitForURL('/maintenance?**');
    await page.waitForURL('/admin/maintenance**', { timeout: 2e4 });
  });

  test('handle backup restore failure', async ({ context, page }) => {
    await utils.resetBackups(admin.accessToken);
    await utils.prepareTestBackup('corrupted.sql');
    await utils.setAuthCookies(context, admin.accessToken);

    await page.goto('/admin/maintenance?isOpen=backups');
    await page.getByRole('button', { name: 'Restore', exact: true }).click();
    await page.locator('#bits-c2').getByRole('button', { name: 'Restore' }).click();

    await page.waitForURL('/maintenance?**');
    await expect(page.getByText('IM CORRUPTED')).toBeVisible({ timeout: 2e4 });
    await page.getByRole('button', { name: 'End maintenance mode' }).click();
    await page.waitForURL('/admin/maintenance**');
  });

  test('restore a backup from onboarding', async ({ context, page }) => {
    await utils.resetBackups(admin.accessToken);
    await utils.createBackup(admin.accessToken);
    await utils.setAuthCookies(context, admin.accessToken);
    await utils.resetDatabase();

    await page.goto('/');
    await page.getByRole('button', { name: 'Restore from backup' }).click();

    try {
      await page.waitForURL('/maintenance**');
    } catch (error) {
      // when chained with the rest of the tests
      // this navigation may fail..? not sure why...
      await page.goto('/maintenance');
      await page.waitForURL('/maintenance**');
    }

    await page.getByRole('button', { name: 'Restore', exact: true }).click();
    await page.locator('#bits-c2').getByRole('button', { name: 'Restore' }).click();

    await page.waitForURL('/maintenance?**');
    await page.waitForURL('/photos', { timeout: 2e4 });
  });
});
