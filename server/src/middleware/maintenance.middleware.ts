import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const maintenance = process.env.MAINTENANCE_MODE === '1';

    if (!maintenance) {
      return next();
    }

    // permit some req.path (e.g. maintenance API routes)

    if (req.path === '/api/system-config/maintenance-mode') {
      return next();
    }

    res.setHeader('Retry-After', '300');

    return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      message: 'Server is in maintenance. Please try again later.',
    });
  }
}
