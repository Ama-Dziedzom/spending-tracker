import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function InsightsTab() {
    const insets = useSafeAreaInsets();
    return (
        <View className="flex-1 bg-white items-center justify-center" style={{ paddingTop: insets.top }}>
            <Text className="text-2xl font-heading text-slate-900">Insights Tab</Text>
            <Text className="text-[17px] font-ui text-slate-500 mt-2">Coming Soon</Text>
        </View>
    );
}
