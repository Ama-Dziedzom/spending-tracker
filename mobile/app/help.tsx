import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Button, CategoryTile, Icon, ListGroup, ListRow, Screen, Sheet, Text, TopBar, useToast, type IconName } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import { exportTransactions } from '@/lib/settings-service';
import { SUPPORT } from '@/constants/support';

const tile = (icon: IconName) => <CategoryTile tone="accent" icon={icon} size={34} />;

/**
 * Help & privacy (Figma 1013:1911). Export is here, not buried. The version
 * line helps support. External links get an out-arrow.
 */
export default function Help() {
    const { colors } = useTheme();
    const toast = useToast();
    const [sheet, setSheet] = useState<'how' | 'stores' | null>(null);
    const [exporting, setExporting] = useState(false);

    const out = <Icon name="sent" size={16} color={colors.text.tertiary} />;
    const open = (url: string) => Linking.openURL(url).catch(() => toast.show({ message: 'Couldn’t open that link.', icon: 'alert' }));

    const doExport = async () => {
        if (exporting) return;
        setExporting(true);
        try {
            const n = await exportTransactions();
            if (n === 0) toast.show({ message: 'Nothing to export yet.', icon: 'info' });
        } catch (e) {
            toast.show({ message: e instanceof Error ? e.message : 'Couldn’t export right now.', icon: 'alert' });
        } finally {
            setExporting(false);
        }
    };

    const version = Constants.expoConfig?.version ?? '';
    const build = Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode;

    return (
        <>
            <Screen header={<TopBar title="Help & privacy" />} contentStyle={{ gap: 12 }}>
                <ListGroup label="Help" labelOnBand>
                    <ListRow
                        dense
                        leading={tile('help')}
                        title="How LogIt reads alerts"
                        trailing={SUPPORT.howItWorksUrl ? out : 'chevron'}
                        onPress={() => (SUPPORT.howItWorksUrl ? open(SUPPORT.howItWorksUrl) : setSheet('how'))}
                    />
                    <ListRow dense leading={tile('settings')} title="Set up autopilot again" trailing="chevron" onPress={() => router.push('/sms-settings')} />
                    {!!SUPPORT.whatsappNumber && (
                        <ListRow dense leading={tile('message')} title="Message us on WhatsApp" trailing={out} onPress={() => open(`https://wa.me/${SUPPORT.whatsappNumber}`)} />
                    )}
                </ListGroup>

                <ListGroup label="Your data" labelOnBand>
                    <ListRow
                        dense
                        leading={tile('download')}
                        title="Export my transactions"
                        value={exporting ? 'Preparing…' : 'CSV'}
                        valueStyle="setting"
                        valueTone="secondary"
                        trailing="chevron"
                        onPress={doExport}
                    />
                    <ListRow dense leading={tile('lock')} title="What LogIt stores" trailing="chevron" onPress={() => setSheet('stores')} />
                    {!!SUPPORT.privacyPolicyUrl && (
                        <ListRow dense leading={tile('message')} title="Privacy policy" trailing={out} onPress={() => open(SUPPORT.privacyPolicyUrl)} />
                    )}
                </ListGroup>

                <View style={{ alignItems: 'center', gap: 2, paddingTop: 4 }}>
                    <Text variant="meta" tone="tertiary">LogIt {version}{build ? ` (${build})` : ''}</Text>
                    <Text variant="meta" tone="tertiary">Made in Accra</Text>
                </View>
            </Screen>

            <Sheet
                visible={sheet !== null}
                onClose={() => setSheet(null)}
                title={sheet === 'how' ? 'How LogIt reads alerts' : 'What LogIt stores'}
                footer={<Button label="Got it" variant="secondary" onPress={() => setSheet(null)} />}
            >
                {sheet === 'how' ? (
                    <>
                        <Text tone="secondary">When a MoMo or bank alert arrives, autopilot passes just that message to LogIt. LogIt reads the amount, who it was to or from, the time and the balance, and adds it to the right wallet.</Text>
                        <Text tone="secondary">It only reads alerts from banks and mobile money. Chats that mention money are ignored.</Text>
                        <Text tone="secondary">Anything it can’t read waits in Check, so nothing is lost.</Text>
                    </>
                ) : (
                    <>
                        <Text tone="secondary">Your transactions, wallets and the alert text each one came from, so you can see exactly what LogIt read.</Text>
                        <Text tone="secondary">Your name, phone number, avatar choice and settings.</Text>
                        <Text tone="secondary">Only you can see your transactions. If you turn on “Help LogIt read more banks”, LogIt also keeps the wording of messages it can’t read, with every amount, name and number removed.</Text>
                    </>
                )}
            </Sheet>
        </>
    );
}
