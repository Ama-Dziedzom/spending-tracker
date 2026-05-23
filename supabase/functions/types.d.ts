// Ambient type declarations for Deno runtime APIs
// This file helps the IDE's TypeScript language service understand
// Deno globals and URL imports used by Supabase Edge Functions.

declare namespace Deno {
  interface Env {
    get(key: string): string | undefined
    set(key: string, value: string): void
    delete(key: string): void
    has(key: string): boolean
    toObject(): Record<string, string>
  }
  const env: Env
}

declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export function serve(
    handler: (request: Request) => Response | Promise<Response>
  ): void
}
