import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AppModule } from './app.module';
import { UPLOAD_DIR } from './database/community-db';

// Loaded before the module graph is built: ADMIN_EMAILS and GEMINI_API_KEY are
// read at construction time, not per request.
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * The built web app (frontend/dist), served by this same process in
 * production so the whole product is one service with one address. Absent in
 * local development, where Vite serves the web app and proxies /api here.
 */
const WEB_DIR = process.env.WEB_DIR || path.resolve(__dirname, '..', 'public');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // The web and mobile clients report their own errors; this keeps the
    // server log readable rather than echoing every request.
    logger: ['log', 'warn', 'error'],
  });
  const logger = new Logger('Bootstrap');

  // Which proxies to believe about the visitor's real IP (X-Forwarded-For).
  // The sign-in and posting rate limits depend on it. Railway puts one proxy
  // in front of the app; locally it is Docker or nothing. Override with
  // TRUST_PROXY (a hop count like "1", or proxy-addr names/CIDRs).
  const trustProxy =
    process.env.TRUST_PROXY ||
    (process.env.RAILWAY_PROJECT_ID ? '1' : 'loopback, linklocal, uniquelocal');
  app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
  app.disable('x-powered-by');

  // Baseline security headers on every response.
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // Only over HTTPS (req.secure honours X-Forwarded-Proto via trust proxy).
    if (req.secure) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // Photos arrive as base64 data URLs inside the post body, so the default
  // 100kb limit is far too small. The composer resizes before upload and
  // community-db rejects anything over 6MB decoded.
  app.use(express.json({ limit: '12mb' }));
  app.use(express.urlencoded({ limit: '12mb', extended: true }));

  // Every route is under /api, which keeps the paths identical to the Express
  // server this replaced - no client had to change.
  app.setGlobalPrefix('api');

  // No global ValidationPipe on purpose. It needs class-validator, and there
  // is nothing here for it to do: the database layer already clamps, trims and
  // sanitises every field (see validatePost and clampTarget), and it is
  // deliberately forgiving - a post that is merely untidy should be saved, not
  // rejected. Adding a dependency to enforce rules we do not want would be
  // worse than not having it.

  // Cross-origin access is off by default: in production the web app is
  // served from this same origin, and the native mobile app is not subject to
  // CORS at all. List extra origins (comma separated) in CORS_ORIGINS when
  // needed, e.g. for Expo's web preview during development.
  const corsOrigins = String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (corsOrigins.length) {
    app.enableCors({ origin: corsOrigins, allowedHeaders: ['Content-Type', 'Authorization'] });
  }

  // User-uploaded recipe photos. immutable: a filename contains a unique id,
  // so a given URL always refers to the same bytes.
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '365d', immutable: true }));

  if (fs.existsSync(path.join(WEB_DIR, 'index.html'))) {
    // Vite fingerprints everything under /assets, so it can be cached forever;
    // index.html must always be re-checked so a deploy is picked up at once.
    app.use(
      express.static(WEB_DIR, {
        index: false,
        setHeaders: (res, file) => {
          res.setHeader(
            'Cache-Control',
            file.includes(`${path.sep}assets${path.sep}`)
              ? 'public, max-age=31536000, immutable'
              : 'public, max-age=3600',
          );
        },
      }),
    );
    // Single-page app: any other GET that is not API or a photo gets the app.
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        return next();
      }
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(WEB_DIR, 'index.html'));
    });
    logger.log(`Serving the web app from ${WEB_DIR}`);
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Server listening on http://0.0.0.0:${port}`);
}

bootstrap();
