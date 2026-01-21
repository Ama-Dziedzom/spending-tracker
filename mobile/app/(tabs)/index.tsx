import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Plus,
  AlertTriangle,
  Smartphone,
  ChevronRight,
  Wallet as WalletIcon,
  CreditCard,
  TrendingUp
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Wallet, Transaction, getUnmatchedSources, mapSourceToName, mapSourceToIcon } from '@/lib/wallet-service';
import { cn } from '@/lib/utils';
import { WalletCreationSheet } from '@/components/wallet-creation-sheet';

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [unmatched, setUnmatched] = useState<{ source: string, count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Automatic Detection
  const [showDetectionSheet, setShowDetectionSheet] = useState(false);
  const [newSource, setNewSource] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('is_active', true);

      setWallets(walletData || []);

      const unmatchedSources = await getUnmatchedSources();
      setUnmatched(unmatchedSources);

      // If we found new sources and no wallets exist yet, show detection
      if (unmatchedSources.length > 0 && walletData?.length === 0) {
        setNewSource(unmatchedSources[0].source);
        setShowDetectionSheet(true);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const totalBalance = wallets.reduce((acc, curr) => acc + curr.current_balance, 0);

  // Empty State Component
  if (!isLoading && wallets.length === 0 && unmatched.length === 0) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8" style={{ paddingTop: insets.top }}>
        <View className="w-24 h-24 rounded-full bg-[#F5F8FF] items-center justify-center mb-6">
          <WalletIcon size={40} color="#0F4CFF" />
        </View>
        <Text className="text-3xl font-heading text-slate-900 mb-2">No Wallets Yet</Text>
        <Text className="text-[17px] font-ui text-slate-500 text-center mb-10 leading-[24px]">
          Get started by logging your first transaction or adding a wallet manually.
        </Text>

        <View className="w-full gap-4">
          <Pressable
            onPress={() => router.push('/onboarding-quick-start')}
            className="w-full bg-[#0F4CFF] h-[72px] rounded-[32px] flex-row items-center px-8 shadow-xl shadow-blue-500/20"
          >
            <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center mr-4">
              <Smartphone size={20} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-heading text-[18px]">Share a transaction SMS</Text>
              <Text className="text-white/70 font-ui text-[13px]">We'll create your wallet automatically</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push('/onboarding')}
            className="w-full bg-white border-[1.5px] border-[#DEE6FF] h-[72px] rounded-[32px] flex-row items-center px-8"
          >
            <View className="w-10 h-10 rounded-xl bg-slate-50 items-center justify-center mr-4">
              <Plus size={20} color="#64748B" />
            </View>
            <Text className="text-slate-900 font-heading text-[18px]">Add Wallet Manually</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F8FAFF]"
      style={{ paddingTop: insets.top }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="px-6 py-8">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-slate-400 font-ui text-[15px]">Total Balance</Text>
            <Text className="text-4xl font-numbers text-slate-900">GHS {totalBalance.toFixed(2)}</Text>
          </View>
          <Pressable
            className="w-12 h-12 rounded-full bg-white border border-[#DEE6FF] items-center justify-center"
            onPress={() => router.push('/onboarding')}
          >
            <Plus size={24} color="#0F4CFF" />
          </Pressable>
        </View>

        {/* Unmatched Alert */}
        {unmatched.length > 0 && (
          <Pressable
            onPress={() => router.push('/settings/wallets')} // Assume this route exists or we'll create it
            className="bg-amber-50 border-[1.5px] border-amber-200 rounded-[32px] p-6 mb-8 flex-row items-center gap-4"
          >
            <View className="w-12 h-12 rounded-2xl bg-amber-100 items-center justify-center">
              <AlertTriangle size={24} color="#D97706" />
            </View>
            <View className="flex-1">
              <Text className="text-amber-900 font-heading text-[17px]">
                {unmatched.length} Unmatched Transactions
              </Text>
              <Text className="text-amber-700 font-ui text-[14px]">
                {unmatched.map(u => mapSourceToName(u.source)).join(', ')}
              </Text>
            </View>
            <ChevronRight size={20} color="#D97706" />
          </Pressable>
        )}

        {/* Wallets Section */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-heading text-slate-900">My Wallets</Text>
            <Text className="text-[#0F4CFF] font-heading">See All</Text>
          </View>

          <View className="gap-4">
            {wallets.map(wallet => (
              <Pressable
                key={wallet.id}
                className="bg-white border-[1.5px] border-[#DEE6FF] rounded-[32px] p-5 flex-row items-center gap-4 shadow-sm"
              >
                <View className="w-14 h-14 rounded-2xl bg-[#F5F8FF] items-center justify-center">
                  <Text className="text-2xl">{wallet.icon}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-heading text-[18px] text-slate-900">{wallet.name}</Text>
                  <Text className="font-ui text-[14px] text-slate-400 capitalize">{wallet.type}</Text>
                </View>
                <View className="items-end">
                  <Text className="font-numbers text-[18px] text-slate-900">GHS {wallet.current_balance.toFixed(2)}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Quick Action */}
        <View className="bg-[#0F4CFF] rounded-[40px] p-8 flex-row items-center justify-between overflow-hidden">
          <View className="z-10">
            <Text className="text-white/80 font-ui text-[15px] mb-1">Insights</Text>
            <Text className="text-white font-heading text-[22px] mb-4">View your spending{"\n"}patterns</Text>
            <Pressable className="bg-white/20 self-start px-4 py-2 rounded-full backdrop-blur-md">
              <Text className="text-white font-heading text-[14px]">Try Now</Text>
            </Pressable>
          </View>
          <View className="absolute right-[-20] top-[-20] opacity-20">
            <TrendingUp size={140} color="white" />
          </View>
        </View>
      </View>

      <WalletCreationSheet
        visible={showDetectionSheet}
        source={newSource}
        onClose={() => setShowDetectionSheet(false)}
        onCreated={fetchData}
      />
    </ScrollView>
  );
}
