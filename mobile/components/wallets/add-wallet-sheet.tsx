import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Button, CategoryTile, FieldError, ListGroup, ListRow, Sheet, Text, useToast } from '@/components/ui';
import { FONT, HIT_SLOP } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import type { Wallet } from '@/lib/supabase';
import { MOMO_PROVIDERS, addWallet } from '@/lib/wallets-overview';
import { AmountInput, parseAmount } from '@/components/transactions/pickers';

type Step = 'choose' | 'momo' | 'bank';

/**
 * Add a wallet (Figma 1006:1209). Positioned as the exception: most wallets
 * add themselves from the first alert. Cash goes straight to Count cash.
 */
export function AddWalletSheet({ visible, onClose, onAdded, onCash }: {
    visible: boolean;
    onClose: () => void;
    onAdded: (w: Wallet) => void;
    /** Cash is added by counting it. */
    onCash: () => void;
}) {
    const { colors } = useTheme();
    const toast = useToast();
    const [step, setStep] = useState<Step>('choose');
    const [provider, setProvider] = useState<string>('mtn');
    const [name, setName] = useState('');
    const [balance, setBalance] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setStep('choose');
        setProvider('mtn');
        setName('');
        setBalance('');
        setError(null);
        setBusy(false);
    }, [visible]);

    const save = async () => {
        const walletName = step === 'momo' ? MOMO_PROVIDERS.find((p) => p.id === provider)!.name : name.trim();
        if (!walletName) {
            setError('Give it a name, like GCB or Absa.');
            return;
        }
        setBusy(true);
        try {
            const w = await addWallet({
                type: step === 'momo' ? 'momo' : 'bank',
                name: walletName,
                balance: parseAmount(balance),
                provider: step === 'momo' ? provider : undefined,
            });
            toast.show({ message: `Added · ${w.name}` });
            onAdded(w);
            onClose();
        } catch (e) {
            toast.show({ message: e instanceof Error ? e.message : 'Couldn’t add the wallet. Try again.', icon: 'alert' });
        } finally {
            setBusy(false);
        }
    };

    if (step === 'choose') {
        return (
            <Sheet visible={visible} onClose={onClose} title="Add a wallet" subtitle="Most wallets add themselves from the first alert. Add one by hand if it hasn’t texted yet.">
                <ListGroup bare>
                    <ListRow
                        leading={<CategoryTile tone="accent" icon="wallet" />}
                        title="Mobile money"
                        meta="MTN MoMo, Telecel Cash, AT Money"
                        trailing="chevron"
                        onPress={() => setStep('momo')}
                    />
                    <ListRow
                        leading={<CategoryTile tone="accent" icon="bank" />}
                        title="Bank account or card"
                        meta="GCB, Ecobank, Stanbic, Absa…"
                        trailing="chevron"
                        onPress={() => setStep('bank')}
                    />
                    <ListRow
                        leading={<CategoryTile tone="cash" icon="cash" />}
                        title="Cash"
                        meta="What’s in your pocket"
                        trailing="chevron"
                        onPress={() => { onClose(); onCash(); }}
                    />
                </ListGroup>
            </Sheet>
        );
    }

    return (
        <Sheet
            visible={visible}
            onClose={onClose}
            footer={
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Button label="Back" variant="secondary" fill onPress={() => setStep('choose')} />
                    <Button label="Add wallet" fill busy={busy} onPress={save} />
                </View>
            }
            title={step === 'momo' ? 'Mobile money' : 'Bank account or card'}
            subtitle="Its balance updates from your alerts. Start it at what you have now."
        >
            {step === 'momo' ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
                    {MOMO_PROVIDERS.map((p) => {
                        const active = p.id === provider;
                        return (
                            <Pressable
                                key={p.id}
                                onPress={() => setProvider(p.id)}
                                hitSlop={HIT_SLOP}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: active }}
                                style={{ paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderRadius: 999, backgroundColor: active ? colors.brand.accent : colors.bg.muted }}
                            >
                                <Text size={13} weight="bold" style={{ color: active ? colors.brand['on-accent'] : colors.text.primary }}>{p.name}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            ) : (
                <View style={{ gap: 6 }}>
                    <Text variant="row" tone="secondary">Bank name</Text>
                    <BottomSheetTextInput
                        value={name}
                        onChangeText={(t) => { setName(t); setError(null); }}
                        placeholder="GCB, Ecobank, Absa…"
                        placeholderTextColor={colors.text.tertiary}
                        autoFocus
                        maxLength={40}
                        accessibilityLabel="Bank name"
                        style={{
                            fontFamily: FONT.semibold, fontSize: 16, color: colors.text.primary,
                            backgroundColor: colors.bg.muted, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
                            borderWidth: 1.5, borderColor: error ? colors.status.danger : 'transparent',
                        }}
                    />
                    {error && <FieldError message={error} />}
                </View>
            )}
            <View style={{ gap: 2 }}>
                <Text variant="row" tone="secondary">Balance now (optional)</Text>
                <AmountInput value={balance} onChange={setBalance} />
            </View>
        </Sheet>
    );
}
