import React, { useEffect, useState } from 'react';
import { CategoryTile, ListGroup, ListRow, Screen, TopBar, useToast, type IconName } from '@/components/ui';
import { DEFAULT_NOTIFICATIONS, getProfile, setNotificationPrefs, type NotificationPrefs } from '@/lib/settings-service';

const tile = (icon: IconName) => <CategoryTile tone="accent" icon={icon} size={34} />;

/**
 * Notifications (Figma 1010:2062). Each switch is described by the actual
 * notification it sends. Saved on the account (user_metadata.notification_prefs).
 */
export default function NotificationSettings() {
    const toast = useToast();
    const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATIONS);

    useEffect(() => { getProfile().then((p) => p && setPrefs(p.notifications)).catch(() => {}); }, []);

    const set = (key: keyof NotificationPrefs) => async (on: boolean) => {
        const before = prefs;
        const next = { ...prefs, [key]: on };
        setPrefs(next);
        try {
            await setNotificationPrefs(next);
        } catch (e) {
            setPrefs(before);
            toast.show({ message: e instanceof Error ? e.message : 'Couldn’t save that.', icon: 'alert' });
        }
    };

    return (
        <Screen header={<TopBar title="Notifications" />} contentStyle={{ gap: 12 }}>
            <ListGroup label="Tell me when" labelOnBand>
                <ListRow dense leading={tile('flash')} title="An alert is logged" meta="“Spent GHS 10 on airtime · MTN MoMo”" toggle={{ value: prefs.logged, onChange: set('logged') }} />
                <ListRow dense leading={tile('check')} title="A message needs a look" toggle={{ value: prefs.needsLook, onChange: set('needsLook') }} />
                <ListRow dense leading={tile('receive')} title="Salary day" toggle={{ value: prefs.salaryDay, onChange: set('salaryDay') }} />
            </ListGroup>
            <ListGroup label="Summaries" labelOnBand>
                <ListRow dense leading={tile('calendar')} title="Sunday evening summary" meta="Your week in one line" toggle={{ value: prefs.sundaySummary, onChange: set('sundaySummary') }} />
                <ListRow dense leading={tile('idea')} title="New insights" toggle={{ value: prefs.newInsights, onChange: set('newInsights') }} />
            </ListGroup>
        </Screen>
    );
}
