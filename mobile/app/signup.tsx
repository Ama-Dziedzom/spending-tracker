import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { 
    GoogleIcon, 
    AppleIcon, 
    ArrowRight02Icon, 
    User03Icon, 
    Search01Icon, 
    Cancel01Icon 
} from '@hugeicons/core-free-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import BottomSheet, { BottomSheetView, BottomSheetFlatList, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet';

const AnimatedView = Animated.View as any;

const COUNTRIES = [
    { name: 'Ghana', code: '+233', flag: '🇬🇭', asset: require('../assets/ghana-flag.png') },
    { name: 'Nigeria', code: '+234', flag: '🇳🇬' },
    { name: 'Kenya', code: '+254', flag: '🇰🇪' },
    { name: 'South Africa', code: '+27', flag: '🇿🇦' },
    { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
    { name: 'United States', code: '+1', flag: '🇺🇸' },
    { name: 'Canada', code: '+1', flag: '🇨🇦' },
    { name: 'Rwanda', code: '+250', flag: '🇷🇼' },
    { name: 'Tanzania', code: '+255', flag: '🇹🇿' },
    { name: 'Senegal', code: '+221', flag: '🇸🇳' },
];

export default function SignupScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    // Bottom Sheet
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['70%'], []);
    
    const handleOpenPicker = useCallback(() => {
        bottomSheetRef.current?.expand();
    }, []);

    const handleSelectCountry = useCallback((country: typeof COUNTRIES[0]) => {
        setSelectedCountry(country);
        bottomSheetRef.current?.close();
        setSearchQuery('');
    }, []);

    const filteredCountries = useMemo(() => {
        if (!searchQuery) return COUNTRIES;
        return COUNTRIES.filter(c => 
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            c.code.includes(searchQuery)
        );
    }, [searchQuery]);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.4}
            />
        ),
        []
    );

    const onSignup = async () => {
        if (!name || !phone) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            router.push({
                pathname: '/verify-otp',
                params: { phone, countryCode: selectedCountry.code }
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-[#1642E5]">
            <View style={{ paddingTop: insets.top + 40 }} className="px-7 pb-10">
                <AnimatedView entering={FadeInDown.duration(600)}>
                    <Text className="text-[30px] font-manrope-semibold text-white tracking-tight">
                        Join LogIt
                    </Text>
                    <Text className="text-[18px] font-manrope-medium text-white/60 mt-1">
                        Start your journey to financial clarity today
                    </Text>
                </AnimatedView>
            </View>

            <AnimatedView
                entering={FadeIn.duration(800).delay(200)}
                className="flex-1 bg-white rounded-t-[50px] px-7 pt-[43px]"
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                    >
                        {/* Form */}
                        <View className="gap-6">
                            <View>
                                <Text className="text-[#7C7D80] font-manrope-semibold text-[10px] mb-[11px] uppercase tracking-wider">Full Name</Text>
                                <View className="flex-row items-center bg-[#F9FAFB] border border-[#E5E7EB] h-[50px] rounded-[15px] px-4">
                                    <HugeiconsIcon icon={User03Icon} size={18} color="#7C7D80" />
                                    <TextInput
                                        placeholder="John Doe"
                                        placeholderTextColor="#B2B2B2"
                                        className="flex-1 ml-3 text-slate-900 font-manrope-medium text-[14px]"
                                        value={name}
                                        onChangeText={setName}
                                        autoCapitalize="words"
                                    />
                                </View>
                            </View>

                            <View>
                                <Text className="text-[#7C7D80] font-manrope-semibold text-[10px] mb-[11px] uppercase tracking-wider">Phone Number</Text>
                                <View className="flex-row items-center bg-[#F9FAFB] border border-[#E5E7EB] h-[50px] rounded-[15px] px-4">
                                    <Pressable 
                                        className="flex-row items-center gap-2 border-r border-slate-200 pr-3 mr-3 h-full"
                                        onPress={handleOpenPicker}
                                    >
                                        {selectedCountry.asset ? (
                                            <Image 
                                                source={selectedCountry.asset} 
                                                className="w-[20px] h-[20px] rounded-[4px]"
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <Text className="text-[18px]">{selectedCountry.flag}</Text>
                                        )}
                                        <Text className="text-slate-400 font-manrope-semibold text-[14px]">{selectedCountry.code}</Text>
                                        <Text className="text-slate-400 font-manrope-medium text-[10px]">⌵</Text>
                                    </Pressable>
                                    <TextInput
                                        placeholder="00 000 0000"
                                        placeholderTextColor="#B2B2B2"
                                        className="flex-1 text-slate-900 font-manrope-medium text-[14px]"
                                        value={phone}
                                        onChangeText={setPhone}
                                        keyboardType="phone-pad"
                                    />
                                </View>
                            </View>

                            <Pressable
                                className="bg-[#1642E5] h-[45px] rounded-[20px] items-center justify-center flex-row gap-2 mt-2 active:opacity-90"
                                onPress={onSignup}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Text className="text-white font-manrope-semibold text-[16px]">Create Account</Text>
                                        <HugeiconsIcon icon={ArrowRight02Icon} size={24} color="white" strokeWidth={1.5} />
                                    </>
                                )}
                            </Pressable>
                        </View>

                        {/* Divider */}
                        <View className="flex-row items-center mt-10 mb-10 gap-4">
                            <View className="flex-1 h-[0.5px] bg-[#B2B2B2]/30" />
                            <Text className="text-[#B2B2B2] font-manrope-medium text-[12px]">or</Text>
                            <View className="flex-1 h-[0.5px] bg-[#B2B2B2]/30" />
                        </View>

                        {/* SSO */}
                        <View className="gap-3">
                            <Pressable className="bg-[#F3F3F3] h-[45px] rounded-[12px] flex-row items-center justify-center gap-3 active:bg-[#EAEAEA]">
                                <HugeiconsIcon icon={GoogleIcon} size={20} color="#1642E5" />
                                <Text className="text-[#1340DF] font-manrope-medium text-[14px]">Sign up with Google</Text>
                            </Pressable>
                            <Pressable className="bg-[#F3F3F3] h-[45px] rounded-[12px] flex-row items-center justify-center gap-3 active:bg-[#EAEAEA]">
                                <HugeiconsIcon icon={AppleIcon} size={20} color="#1642E5" />
                                <Text className="text-[#1340DF] font-manrope-medium text-[14px]">Sign up with Apple</Text>
                            </Pressable>
                        </View>

                        {/* Footer */}
                        <View className="mt-12 items-center">
                            <Pressable
                                className="flex-row gap-1"
                                onPress={() => router.push('/login')}
                            >
                                <Text className="text-[#7C7D80] font-manrope-medium text-[14px]">Already have an account?</Text>
                                <Text className="text-[#1340DF] font-manrope-semibold text-[14px]">Log In</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </AnimatedView>

            {/* Country Picker Bottom Sheet */}
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                handleIndicatorStyle={{ backgroundColor: '#E5E7EB', width: 40 }}
                backgroundStyle={{ borderRadius: 40 }}
            >
                <BottomSheetView className="flex-1 px-7 pt-4 pb-10">
                    <View className="flex-row items-center justify-between mb-6">
                        <Text className="text-[#1642E5] font-manrope-bold text-[20px]">Select Country</Text>
                        <Pressable onPress={() => bottomSheetRef.current?.close()}>
                            <HugeiconsIcon icon={Cancel01Icon} size={24} color="#7C7D80" />
                        </Pressable>
                    </View>

                    {/* Search Input */}
                    <View className="flex-row items-center bg-[#F9FAFB] border border-[#E5E7EB] h-[45px] rounded-[15px] px-4 mb-4">
                        <HugeiconsIcon icon={Search01Icon} size={18} color="#7C7D80" />
                        <BottomSheetTextInput
                            placeholder="Search countries..."
                            placeholderTextColor="#B2B2B2"
                            className="flex-1 ml-3 text-slate-900 font-manrope-medium text-[14px]"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    <BottomSheetFlatList
                        data={filteredCountries}
                        keyExtractor={(item: { code: any; name: any; }) => item.code + item.name}
                        renderItem={({ item }: { item: typeof COUNTRIES[number] }) => (
                            <Pressable 
                                className="flex-row items-center justify-between py-4 border-b border-slate-50 active:bg-slate-50"
                                onPress={() => handleSelectCountry(item)}
                            >
                                <View className="flex-row items-center gap-4">
                                    {item.asset ? (
                                        <Image source={item.asset} className="w-[30px] h-[20px] rounded-[4px]" />
                                    ) : (
                                        <Text className="text-[24px]">{item.flag}</Text>
                                    )}
                                    <Text className="text-slate-900 font-manrope-semibold text-[16px]">{item.name}</Text>
                                </View>
                                <Text className="text-slate-400 font-manrope-medium text-[16px]">{item.code}</Text>
                            </Pressable>
                        )}
                        showsVerticalScrollIndicator={false}
                    />
                </BottomSheetView>
            </BottomSheet>
        </View>
    );
}
