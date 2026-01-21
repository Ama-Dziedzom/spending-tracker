import React, { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, Switch } from 'react-native';
import { X, Plus } from 'lucide-react-native';
import { mapSourceToName, createWalletFromTransaction } from '@/lib/wallet-service';

interface WalletCreationSheetProps {
    visible: boolean;
    source: string | null;
    onClose: () => void;
    onCreated: () => void;
}

export function WalletCreationSheet({ visible, source, onClose, onCreated }: WalletCreationSheetProps) {
    const [balance, setBalance] = useState('');
    const [isIncome, setIsIncome] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!source) return;
        setLoading(true);
        try {
            await createWalletFromTransaction(source, parseFloat(balance) || 0);
            onCreated();
            onClose();
        } catch (error) {
            console.error('Error creating wallet:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-black/40">
                <View className="bg-white rounded-t-[48px] p-8 pb-12">
                    <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-8" />

                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-heading text-slate-900">🎉 First Transaction Logged!</Text>
                        <Pressable onPress={onClose} className="p-2">
                            <X size={24} color="#94A3B8" />
                        </Pressable>
                    </View>

                    <Text className="text-[17px] font-ui text-slate-500 mb-6 leading-[24px]">
                        New source detected: <Text className="text-slate-900 font-heading">{source && mapSourceToName(source)}</Text>.
                        Want to create a wallet to track this automatically?
                    </Text>

                    <View className="gap-6 mb-10">
                        <View className="gap-3">
                            <Text className="text-sm font-heading text-slate-500 ml-1 uppercase tracking-wider">Current Balance (Optional)</Text>
                            <View className="flex-row items-center h-[68px] rounded-3xl border-[1.5px] border-slate-100 px-6 bg-slate-50/50">
                                <Text className="text-lg font-heading text-slate-400 mr-2">GHS</Text>
                                <TextInput
                                    className="flex-1 text-lg font-numbers text-slate-900"
                                    placeholder="0.00"
                                    keyboardType="decimal-pad"
                                    value={balance}
                                    onChangeText={setBalance}
                                />
                            </View>
                        </View>

                        <View className="flex-row items-center justify-between p-6 rounded-[32px] bg-[#F5F8FF]">
                            <View className="flex-row items-center gap-4">
                                <View className="w-10 h-10 rounded-xl bg-white items-center justify-center">
                                    <Plus size={20} color="#0F4CFF" />
                                </View>
                                <View>
                                    <Text className="text-[16px] font-heading text-slate-900">Receive Income Here</Text>
                                    <Text className="text-xs font-ui text-slate-400">Flag as regular income</Text>
                                </View>
                            </View>
                            <Switch
                                value={isIncome}
                                onValueChange={setIsIncome}
                                trackColor={{ false: '#E2E8F0', true: '#0F4CFF' }}
                            />
                        </View>
                    </View>

                    <Pressable
                        onPress={handleCreate}
                        disabled={loading}
                        className={loading ? "w-full h-[64px] rounded-[32px] bg-slate-200 items-center justify-center" : "w-full h-[64px] rounded-[32px] bg-[#1A51FF] items-center justify-center shadow-xl shadow-blue-500/20"}
                    >
                        <Text className="text-white text-[20px] font-heading">{loading ? "Creating..." : "Create Wallet"}</Text>
                    </Pressable>

                    <Pressable
                        onPress={onClose}
                        className="w-full py-4 items-center"
                    >
                        <Text className="text-slate-400 font-heading text-[17px]">Skip for Now</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}
