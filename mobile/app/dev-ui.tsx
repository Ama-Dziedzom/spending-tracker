// Dev-only gallery of the v1 shared components. Open with router.push('/dev-ui').
// Not linked from the app; remove before release or keep behind __DEV__.
import React, { useState } from 'react';
import { View } from 'react-native';
import {
    ActionBanner, AskBar, Avatar, Banner, Button, Card, CardHeader, CategoryTile, Chip, DayBars,
    Dialog, FieldError, HBars, InlineLoader, InsetPanel, ListDayHeader, ListGroup, ListRow,
    LogItLabel, OfflinePill, ProgressMeter, RoundButton, Screen, SegmentedControl, Sheet,
    SkeletonRow, SuggestionRow, Text, TopBar, UserBubble, useToast,
} from '@/components/ui';
import { useTheme, type ThemePreference } from '@/lib/theme';

const PERIODS = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This week' },
    { value: 'month', label: 'This month' },
] as const;
const THEMES = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'Auto' },
] as const;

export default function DevUi() {
    const { preference, setPreference, colors } = useTheme();
    const toast = useToast();
    const [period, setPeriod] = useState<(typeof PERIODS)[number]['value']>('week');
    const [toggle, setToggle] = useState(true);
    const [dialog, setDialog] = useState(false);
    const [sheet, setSheet] = useState(false);
    const [busy, setBusy] = useState(false);

    return (
        <>
            <Screen
                header={<TopBar title="Components" right={<RoundButton icon="more" label="More" onPress={() => {}} />} />}
            >
                <Card hero gap={16}>
                    <CardHeader title="Spending" right={<RoundButton icon="more" label="More" tone="card" onPress={() => {}} />} />
                    <SegmentedControl options={PERIODS} value={period} onChange={setPeriod} />
                    <View style={{ gap: 4 }}>
                        <Text size={13} weight="semibold" tone="secondary">Spent this week</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                                <Text size={15} weight="bold" tone="secondary">GHS</Text>
                                <Text variant="hero">351</Text>
                            </View>
                            <Chip variant="tag" tone="success" label="42 less than last week" />
                        </View>
                    </View>
                    <DayBars
                        bars={[
                            { label: 'M', value: 42 }, { label: 'T', value: 58 }, { label: 'W', value: 251, current: true },
                            { label: 'T', value: null }, { label: 'F', value: null }, { label: 'S', value: null }, { label: 'S', value: null },
                        ]}
                    />
                    <InsetPanel>
                        <CategoryTile tone="shopping" icon="shopping" size={28} />
                        <Text size={13} weight="semibold" tone="secondary" style={{ flex: 1 }}>
                            Wednesday was your big day: Akosua, Shoprite and airtime
                        </Text>
                    </InsetPanel>
                </Card>

                <ActionBanner icon="check" title="2 messages to check" body="I couldn’t tell what they were" actionLabel="Check" onPress={() => {}} />
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    <Chip icon="cash" label="Log cash" onPress={() => {}} />
                    <Chip icon="paste" label="Paste a message" onPress={() => {}} />
                    <Chip icon="receive" label="Set salary" onPress={() => {}} />
                </View>

                <OfflinePill label="Offline · 2 alerts will log when you’re back" />

                <Card padding={18} gap={8}>
                    <ListDayHeader title="Today" summary="251.00 out" />
                    <ListGroup bare>
                        <ListRow leading={<CategoryTile tone="people" initials="AM" />} title="Akosua Mensah" meta="Sent · MTN MoMo · 13:02" value="120.00" onPress={() => {}} />
                        <ListRow leading={<CategoryTile tone="shopping" icon="shopping" />} title="Shoprite, Accra Mall" meta="Card · Standard Chartered · 17:45" value="81.00" onPress={() => {}} />
                        <ListRow leading={<CategoryTile tone="people" initials="KO" />} title="Kofi Owusu" meta="Received · MTN MoMo · 18:40" value="+200.00" valueTone="success" />
                        <ListRow leading={<CategoryTile tone="muted" icon="moved" />} title="To your Affinity account" meta="Moved · not spending" value="150.00" />
                    </ListGroup>
                </Card>

                <ListGroup label="APP" labelOnBand={false}>
                    <ListRow dense leading={<CategoryTile tone="accent" icon="moon" size={34} />} title="Theme"
                        trailing={<SegmentedControl variant="pill" options={THEMES} value={preference} onChange={(v) => setPreference(v as ThemePreference)} />} />
                    <ListRow dense leading={<CategoryTile tone="accent" icon="bell" size={34} />} title="Notifications" value="On" valueStyle="setting" valueTone="secondary" trailing="chevron" onPress={() => {}} />
                    <ListRow dense leading={<CategoryTile tone="accent" icon="lock" size={34} />} title="Lock with Face ID" toggle={{ value: toggle, onChange: setToggle }} />
                </ListGroup>

                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <Avatar choice="illustration_1" size={52} />
                    <Avatar choice="illustration_2" size={52} />
                    <Avatar choice="initials" name="Ama" size={52} />
                </View>

                <Banner tone="info" title="2 messages need a look" body="LogIt couldn’t tell the category." action={{ label: 'Review', onPress: () => {} }} />
                <Banner tone="warn" title="Autopilot hasn’t run since Monday" body="Your Shortcut may have been turned off." action={{ label: 'Fix it', onPress: () => {} }} />
                <Banner tone="success" title="Did your salary come in?" body="You usually get ~GHS 3,000 on the 28th." action={{ label: 'Yes, log it', onPress: () => {} }} />
                <Banner tone="danger" title="Couldn’t read 1 alert" body="We saved the text so nothing is lost." action={{ label: 'Open', onPress: () => {} }} />
                <FieldError message="Too short. Ghana numbers have 9 digits after +233." />

                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button label="Send code" busyLabel="Sending code" busy={busy} onPress={() => { setBusy(true); setTimeout(() => setBusy(false), 1500); }} fill />
                    <Button label="Saving…" variant="secondary" onPress={() => {}} fill />
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button label="Delete…" variant="danger" size="md" onPress={() => setDialog(true)} fill />
                    <Button label="Open sheet" variant="ink" size="md" onPress={() => setSheet(true)} fill />
                </View>
                <Button label="Show toast" variant="secondary" size="md"
                    onPress={() => toast.show({ message: 'Transaction deleted', icon: 'trash', action: { label: 'Undo', onPress: () => {} } })} />

                <Card gap={14}><SkeletonRow /><SkeletonRow /></Card>
                <Card gap={10}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text variant="row">Reading 312 old messages</Text>
                        <Text variant="row" weight="bold" tone="accent">64%</Text>
                    </View>
                    <ProgressMeter progress={0.64} />
                    <Text variant="meta" tone="secondary">You can leave this screen. We’ll tell you when it’s done.</Text>
                </Card>
                <InlineLoader label="Loading older transactions…" />

                <UserBubble>How much did I spend on airtime this month?</UserBubble>
                <LogItLabel />
                <Card gap={12}>
                    <Text size={13} weight="bold">Last 3 months</Text>
                    <HBars color={colors.cat.airtime} rows={[{ label: 'Sep', value: 180 }, { label: 'Oct', value: 200 }, { label: 'Nov', value: 260, current: true }]} />
                </Card>
                <Chip variant="muted" icon="paste" label="From 14 transactions" trailingChevron onPress={() => {}} />
                <SuggestionRow label="Why is it up?" onPress={() => {}} />
                <AskBar onPress={() => {}} onKeyboard={() => {}} onMic={() => {}} />
            </Screen>

            <Dialog
                visible={dialog}
                onCancel={() => setDialog(false)}
                onConfirm={() => setDialog(false)}
                icon="trash"
                title="Delete this transaction?"
                body="GHS 85 at Papaye will be removed from Food and your totals."
                cancelLabel="Keep"
                confirmLabel="Delete"
            />
            <Sheet visible={sheet} onClose={() => setSheet(false)} title="Add to LogIt">
                <ListGroup bare>
                    <ListRow leading={<CategoryTile tone="accent" icon="paste" size={44} />} title="Paste a message" meta="From MoMo or your bank" trailing="chevron" onPress={() => setSheet(false)} />
                    <ListRow leading={<CategoryTile tone="cash" icon="cash" size={44} />} title="Log cash" meta="Spent cash you took out" trailing="chevron" onPress={() => setSheet(false)} />
                </ListGroup>
            </Sheet>
        </>
    );
}
