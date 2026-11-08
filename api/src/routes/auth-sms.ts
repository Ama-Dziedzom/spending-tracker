/**
 * POST /api/auth/send-sms — Supabase "Send SMS" auth hook.
 *
 * Supabase generates the one-time code; this route delivers it. Arkesel goes
 * first (local gateway, "LogIt" sender name, good delivery to MTN / Telecel /
 * AT); Twilio is the fallback if Arkesel fails or isn't configured.
 *
 * Every request is signed by Supabase (Standard Webhooks). Anything without a
 * valid signature is refused, so nobody else can use this to send texts.
 *
 * Env:
 *   SEND_SMS_HOOK_SECRET   from Supabase › Auth › Hooks (looks like v1,whsec_…)
 *   ARKESEL_API_KEY        Arkesel dashboard › API keys
 *   ARKESEL_SENDER_ID      approved sender name, max 11 characters (e.g. LogIt)
 *   TWILIO_ACCOUNT_SID     optional fallback
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM            a Twilio number or approved alphanumeric sender, or…
 *   TWILIO_MESSAGING_SERVICE_SID   …a Messaging Service instead of TWILIO_FROM
 */

import express, { Router, type Request, type Response } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const authSmsRouter = Router();

const TOLERANCE_SECONDS = 5 * 60;

/** Standard Webhooks verification (what Supabase auth hooks use). Returns the parsed body or null. */
export function verifyHook(rawBody: string, headers: Record<string, string | string[] | undefined>, secret: string): unknown | null {
  const id = String(headers['webhook-id'] ?? '');
  const timestamp = String(headers['webhook-timestamp'] ?? '');
  const signatures = String(headers['webhook-signature'] ?? '');
  if (!id || !timestamp || !signatures || !secret) return null;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) return null;

  const key = Buffer.from(secret.replace(/^v1,/, '').replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest();

  // Header can carry several space-separated "v1,<base64>" signatures
  const ok = signatures.split(' ').some((part) => {
    const [version, sig] = part.split(',');
    if (version !== 'v1' || !sig) return false;
    const given = Buffer.from(sig, 'base64');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
  if (!ok) return null;
  try { return JSON.parse(rawBody); } catch { return null; }
}

function messageFor(otp: string): string {
  return `${otp} is your LogIt code. Don't share it with anyone, not even LogIt.`;
}

async function sendWithArkesel(phone: string, text: string): Promise<{ ok: boolean; detail: string }> {
  const key = process.env.ARKESEL_API_KEY, sender = process.env.ARKESEL_SENDER_ID;
  if (!key || !sender) return { ok: false, detail: 'arkesel not configured' };
  const res = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender, message: text, recipients: [phone.replace(/^\+/, '')] }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.text();
  let status = '';
  try { status = String((JSON.parse(body) as { status?: string }).status ?? ''); } catch { /* not JSON */ }
  return { ok: res.ok && (status === '' || status.toLowerCase() === 'success'), detail: `${res.status} ${status}`.trim() };
}

async function sendWithTwilio(phone: string, text: string): Promise<{ ok: boolean; detail: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM, service = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !token || (!from && !service)) return { ok: false, detail: 'twilio not configured' };
  const form = new URLSearchParams({ To: phone, Body: text });
  if (service) form.set('MessagingServiceSid', service); else form.set('From', from!);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
    signal: AbortSignal.timeout(10_000),
  });
  return { ok: res.ok, detail: String(res.status) };
}

const mask = (phone: string) => phone.replace(/^(\+?\d{3})\d+(\d{3})$/, '$1•••••$2');

authSmsRouter.post('/auth/send-sms', express.text({ type: '*/*', limit: '64kb' }), async (req: Request, res: Response) => {
  const raw = typeof req.body === 'string' ? req.body : '';
  const payload = verifyHook(raw, req.headers, process.env.SEND_SMS_HOOK_SECRET ?? '') as
    | { user?: { phone?: string }; sms?: { otp?: string } } | null;
  if (!payload) {
    res.status(401).json({ error: { http_code: 401, message: 'Invalid signature' } });
    return;
  }

  const phone = payload.user?.phone ? (payload.user.phone.startsWith('+') ? payload.user.phone : `+${payload.user.phone}`) : '';
  const otp = payload.sms?.otp ?? '';
  if (!phone || !/^\d{4,10}$/.test(otp)) {
    res.status(400).json({ error: { http_code: 400, message: 'Missing phone or code' } });
    return;
  }

  const text = messageFor(otp);
  const attempts: string[] = [];
  try {
    const a = await sendWithArkesel(phone, text);
    attempts.push(`arkesel ${a.detail}`);
    if (a.ok) { console.log(`📨 Code sent to ${mask(phone)} via Arkesel`); res.json({}); return; }
  } catch (e) { attempts.push(`arkesel error ${e instanceof Error ? e.message : e}`); }
  try {
    const t = await sendWithTwilio(phone, text);
    attempts.push(`twilio ${t.detail}`);
    if (t.ok) { console.log(`📨 Code sent to ${mask(phone)} via Twilio (fallback)`); res.json({}); return; }
  } catch (e) { attempts.push(`twilio error ${e instanceof Error ? e.message : e}`); }

  console.error(`❌ Couldn't send code to ${mask(phone)}: ${attempts.join(' · ')}`);
  res.status(500).json({ error: { http_code: 500, message: "We couldn't send your code. Please try again." } });
});
