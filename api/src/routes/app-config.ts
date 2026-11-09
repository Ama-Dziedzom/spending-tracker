import { Router } from 'express';

/**
 * App config read at launch. Update required (Figma 1014:2283) shows when the
 * installed version is below MIN_APP_VERSION, e.g. after a reader change that
 * can't ship over the air. Unset means no minimum.
 */
export const appConfigRouter = Router();

appConfigRouter.get('/app-config', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({
    minVersion: process.env.MIN_APP_VERSION || null,
    /** Optional plain-words reason shown on the screen. */
    updateMessage: process.env.MIN_APP_VERSION_MESSAGE || null,
  });
});
