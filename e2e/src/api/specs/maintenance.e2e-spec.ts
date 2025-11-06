import { LoginResponseDto } from '@immich/sdk';
import { createUserDto } from 'src/fixtures';
import { errorDto } from 'src/responses';
import { app, utils } from 'src/utils';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

describe('/admin/maintenance', () => {
  let admin: LoginResponseDto;
  let nonAdmin: LoginResponseDto;

  beforeAll(async () => {
    await utils.resetDatabase();
    admin = await utils.adminSetup();
    nonAdmin = await utils.userSetup(admin.accessToken, createUserDto.user1);
  });

  describe.sequential('normal operation', () => {
    describe('GET ~/server/config', async () => {
      it('should indicate we are out of maintenance mode', async () => {
        const { status, body } = await request(app).get('/server/config');
        expect(status).toBe(200);
        expect(body.maintenanceMode).toBeFalsy();
      });
    });

    describe('POST /login', async () => {
      it('should not work out of maintenance mode', async () => {
        const { status, body } = await request(app).post('/admin/maintenance/login').send({ token: 'token' });
        expect(status).toBe(400);
        expect(body).toEqual(errorDto.badRequest('Not in maintenance mode'));
      });
    });

    describe('POST /end', async () => {
      it('should not work out of maintenance mode', async () => {
        const { status, body } = await request(app).post('/admin/maintenance/end').send();
        expect(status).toBe(400);
        expect(body).toEqual(errorDto.badRequest('Not in maintenance mode'));
      });
    });
  });

  describe.sequential('maintenance', () => {
    let cookie: string | undefined;

    describe.sequential('POST /start', () => {
      it('should require authentication', async () => {
        const { status, body } = await request(app).post('/admin/maintenance/start').send();
        expect(status).toBe(401);
        expect(body).toEqual(errorDto.unauthorized);
      });

      it('should only work for admins', async () => {
        const { status, body } = await request(app)
          .post('/admin/maintenance/start')
          .set('Authorization', `Bearer ${nonAdmin.accessToken}`)
          .send();
        expect(status).toBe(403);
        expect(body).toEqual(errorDto.forbidden);
      });

      it('should enter maintenance mode', async () => {
        const { status, body, headers } = await request(app)
          .post('/admin/maintenance/start')
          .set('Authorization', `Bearer ${admin.accessToken}`)
          .send();

        expect(status).toBe(201);
        expect(body).toEqual({
          isMaintenanceMode: true,
        });

        cookie = headers.Cookie;

        await expect
          .poll(
            async () => {
              const { body } = await request(app).get('/server/config');
              return body.maintenanceMode;
            },
            {
              interval: 1e3,
              timeout: 5e3,
            },
          )
          .toBeTruthy();
      });
    });

    describe.sequential('POST /end', () => {
      it('should exit maintenance mode', async () => {
        const { status, body } = await request(app).post('/admin/maintenance/end').set('Set-Cookie', cookie!).send();

        expect(status).toBe(201);
        expect(body).toEqual({
          isMaintenanceMode: false,
        });

        await expect
          .poll(
            async () => {
              const { body } = await request(app).get('/server/config');
              return body.maintenanceMode;
            },
            {
              interval: 1e3,
              timeout: 5e3,
            },
          )
          .toBeFalsy();
      });
    });
  });
});
