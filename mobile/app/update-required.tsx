import React from 'react';
import { Linking, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StateScreen } from '@/components/system/state-screen';
import { useToast } from '@/components/ui';
import { SUPPORT } from '@/constants/support';

/**
 * Update required (Figma 1014:2283). Rare: only when a reader change can't
 * ship over the air. Says why in plain words. No way past it.
 */
export default function UpdateRequired() {
    const toast = useToast();
    const { reason } = useLocalSearchParams<{ reason?: string }>();
    const url = Platform.OS === 'ios' ? SUPPORT.appStoreUrl : SUPPORT.playStoreUrl;

    return (
        <StateScreen
            tone="band"
            icon="download"
            title="Update LogIt"
            body={reason || 'This version can’t read some new MoMo alerts. The update takes under a minute and keeps everything.'}
            primary={{
                label: 'Update now',
                onPress: () => (url
                    ? Linking.openURL(url).catch(() => toast.show({ message: 'Open the App Store and update LogIt.', icon: 'info' }))
                    : toast.show({ message: `Open the ${Platform.OS === 'ios' ? 'App Store' : 'Play Store'} and update LogIt.`, icon: 'info' })),
            }}
        />
    );
}
