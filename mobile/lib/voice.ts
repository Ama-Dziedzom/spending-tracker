/**
 * Voice questions for Ask LogIt, through expo-speech-recognition. Loaded
 * lazily so a build made before the module was added still runs: voice is
 * then unavailable and the Ask bar falls back to typing.
 */
type SR = typeof import('expo-speech-recognition');

function load(): SR | null {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('expo-speech-recognition') as SR;
    } catch {
        return null;
    }
}

export function voiceAvailable(): boolean {
    const m = load();
    try {
        return !!m && m.ExpoSpeechRecognitionModule.isRecognitionAvailable();
    } catch {
        return false;
    }
}

export type MicPermission = 'granted' | 'denied' | 'undetermined';

export async function micPermission(): Promise<MicPermission> {
    const m = load();
    if (!m) return 'denied';
    try {
        const r = await m.ExpoSpeechRecognitionModule.getPermissionsAsync();
        return r.granted ? 'granted' : r.canAskAgain ? 'undetermined' : 'denied';
    } catch {
        return 'denied';
    }
}

export async function requestMic(): Promise<boolean> {
    const m = load();
    if (!m) return false;
    try {
        return (await m.ExpoSpeechRecognitionModule.requestPermissionsAsync()).granted;
    } catch {
        return false;
    }
}

export interface Listening { stop: () => void; cancel: () => void }

/** Stop this long after the last word (people pause mid-question). */
const SILENCE_AFTER_WORDS_MS = 2200;
/** Give up if nothing at all is heard for this long. */
const WAIT_FOR_FIRST_WORD_MS = 8000;
// iOS has no en-GH recogniser (checked on device, Nov 2026); en-GB is the
// closest match for Ghanaian English. en-US is the backup.
const LOCALES = ['en-GB', 'en-US'];

/**
 * Start listening. onWords fires as words arrive (the listening screen shows
 * them); onEnd fires once with the final text (empty when nothing was heard).
 *
 * Runs in continuous mode and decides when to stop itself: iOS's own
 * end-of-speech detection cut people off before they'd started talking.
 * Uses en-GB, falling back to en-US if that recogniser isn't available.
 */
export function listen(onWords: (text: string) => void, onEnd: (finalText: string, error?: string) => void): Listening | null {
    const m = load();
    if (!m) return null;
    const mod = m.ExpoSpeechRecognitionModule;
    let latest = '';
    let ended = false;
    let stopping = false;
    let localeIndex = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => { if (timer) { clearTimeout(timer); timer = null; } };
    const stopSoon = (ms: number) => {
        clearTimer();
        timer = setTimeout(() => { stopping = true; try { mod.stop(); } catch { finish(); } }, ms);
    };
    const finish = (err?: string) => {
        if (ended) return;
        ended = true;
        clearTimer();
        subs.forEach((s) => s.remove());
        onEnd(latest.trim(), err);
    };
    const begin = () => {
        mod.start({
            lang: LOCALES[localeIndex],
            interimResults: true,
            continuous: true,
            addsPunctuation: true,
            contextualStrings: ['GHS', 'MoMo', 'airtime', 'trotro', 'cedis'],
        });
        stopSoon(WAIT_FOR_FIRST_WORD_MS);
    };

    const subs = [
        mod.addListener('result', (e: { results: { transcript: string }[]; isFinal: boolean }) => {
            const t = e.results[0]?.transcript;
            if (t) { latest = t; onWords(latest); }
            if (!stopping) stopSoon(SILENCE_AFTER_WORDS_MS);
        }),
        mod.addListener('end', () => finish()),
        mod.addListener('error', (e: { error: string; message: string }) => {
            console.warn('[voice]', e.error, e.message);
            // No Ghanaian English recogniser on this phone: try en-US once.
            if (e.error === 'language-not-supported' && !latest && localeIndex < LOCALES.length - 1) {
                localeIndex += 1;
                try { begin(); return; } catch { /* fall through */ }
            }
            finish(e.error === 'no-speech' || e.error === 'aborted' ? undefined : e.message);
        }),
    ];

    try {
        begin();
    } catch (e) {
        finish(e instanceof Error ? e.message : 'Couldn’t start listening');
        return null;
    }
    return {
        stop: () => { stopping = true; clearTimer(); try { mod.stop(); } catch { finish(); } },
        cancel: () => { latest = ''; stopping = true; clearTimer(); try { mod.abort(); } catch { /* already stopped */ } finish(); },
    };
}
