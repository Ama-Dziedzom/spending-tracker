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

/**
 * Start listening. onWords fires as words arrive (the listening screen shows
 * them); onEnd fires once with the final text (empty when nothing was heard).
 */
export function listen(onWords: (text: string) => void, onEnd: (finalText: string, error?: string) => void): Listening | null {
    const m = load();
    if (!m) return null;
    const mod = m.ExpoSpeechRecognitionModule;
    let latest = '';
    let ended = false;
    const finish = (err?: string) => {
        if (ended) return;
        ended = true;
        subs.forEach((s) => s.remove());
        onEnd(latest.trim(), err);
    };
    const subs = [
        mod.addListener('result', (e: { results: { transcript: string }[]; isFinal: boolean }) => {
            latest = e.results[0]?.transcript ?? latest;
            onWords(latest);
        }),
        mod.addListener('end', () => finish()),
        mod.addListener('error', (e: { error: string; message: string }) => finish(e.error === 'no-speech' ? undefined : e.message)),
    ];
    try {
        mod.start({ lang: 'en-GH', interimResults: true, continuous: false, addsPunctuation: true, contextualStrings: ['GHS', 'MoMo', 'airtime', 'trotro', 'cedis'] });
    } catch (e) {
        finish(e instanceof Error ? e.message : 'Couldn’t start listening');
        return null;
    }
    return {
        stop: () => { try { mod.stop(); } catch { finish(); } },
        cancel: () => { latest = ''; try { mod.abort(); } catch { /* already stopped */ } finish(); },
    };
}
