import React, { useState } from 'react';
import { Alert } from 'react-native';
import { LinkTransactionsBottomSheet } from '@/components/link-transactions-bottom-sheet';
import { SelectWalletTypeBottomSheet } from '@/components/select-wallet-type-bottom-sheet';
import { ConfigureWalletBottomSheet } from '@/components/configure-wallet-bottom-sheet';
import { createWallets, type CreateWalletInput } from '@/lib/wallet-service';
import { assignTransactionToWallet, processTransfer } from '@/lib/transaction-service';
import type { Transaction, Wallet } from '@/lib/supabase';

/**
 * Link unassigned transactions to wallets, creating a wallet on the way if
 * needed. Moved as-is from the old dashboard; in v1 this belongs in Check
 * ("which account"), and moves there when the Check screens are built.
 */
export function LinkWalletsFlow({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone: () => void }) {
    const [isSelectTypeSheetVisible, setIsSelectTypeSheetVisible] = useState(false);
    const [isConfigureSheetVisible, setIsConfigureSheetVisible] = useState(false);
    const [selectedWalletTypes, setSelectedWalletTypes] = useState<string[]>([]);
    const [isSavingWallet, setIsSavingWallet] = useState(false);
    const [activeTransaction, setActiveTransaction] = useState<Transaction | null>(null);
    const [transferState, setTransferState] = useState<{ isTransfer: boolean; sourceId: string | null } | null>(null);

    const handleCreateWalletFromLink = (tx: Transaction, isTransfer?: boolean, sourceId?: string | null) => {
        setActiveTransaction(tx);
        setTransferState(isTransfer ? { isTransfer, sourceId: sourceId || null } : null);
        onClose();
        // Delay to allow link sheet to close
        setTimeout(() => setIsSelectTypeSheetVisible(true), 800);
    };

    const handleSelectType = (types: string[]) => {
        setSelectedWalletTypes(types);
        setIsSelectTypeSheetVisible(false);
        setTimeout(() => setIsConfigureSheetVisible(true), 800);
    };

    const handleConfigureWallet = async (data: any) => {
        setIsSavingWallet(true);
        try {
            const desc = activeTransaction?.description?.toLowerCase() || '';
            const walletsToCreate: CreateWalletInput[] = [];

            if (data.momo) {
                walletsToCreate.push({ name: 'Mobile Money', type: 'momo', icon: 'wallet-03', color: '#1642E5', initial_balance: 0, source_identifier: data.momo.provider });
            }
            if (data.bank) {
                walletsToCreate.push({ name: data.bank.name || 'Bank Wallet', type: 'bank', icon: 'bank', color: '#1642E5', initial_balance: 0 });
            }
            if (data.cash) {
                walletsToCreate.push({ name: data.cash.name || 'Cash Wallet', type: 'cash', icon: 'money-01', color: '#1642E5', initial_balance: 0 });
            }

            let createdWallets: Wallet[] = [];
            if (walletsToCreate.length > 0) createdWallets = await createWallets(walletsToCreate);

            // If we came from a detected transaction, link it to the most relevant wallet.
            if (activeTransaction && createdWallets.length > 0) {
                let targetWallet = createdWallets[0];
                if (createdWallets.length > 1) {
                    const isMomo = desc.includes('mtn') || desc.includes('momo') || desc.includes('telecel') || desc.includes('vodafone');
                    const momoWallet = createdWallets.find((w) => w.type === 'momo');
                    const bankWallet = createdWallets.find((w) => w.type === 'bank');
                    if (isMomo && momoWallet) targetWallet = momoWallet;
                    else if (!isMomo && bankWallet) targetWallet = bankWallet;
                }

                if (transferState?.isTransfer && transferState.sourceId) {
                    await processTransfer(activeTransaction.id, transferState.sourceId, targetWallet.id, Number(activeTransaction.amount), activeTransaction.description);
                } else {
                    await assignTransactionToWallet(activeTransaction.id, targetWallet.id);
                }
                setTimeout(() => Alert.alert('Success', 'Wallet created and transaction linked!'), 500);
            }

            setActiveTransaction(null);
            setTransferState(null);
        } catch (error) {
            console.error('Error saving wallet:', error);
            Alert.alert('Error', 'Failed to save your wallet. Please try again.');
        } finally {
            setIsSavingWallet(false);
        }
    };

    return (
        <>
            <LinkTransactionsBottomSheet isVisible={visible} onClose={onClose} onSuccess={onDone} onCreateWallet={handleCreateWalletFromLink} />
            <SelectWalletTypeBottomSheet isVisible={isSelectTypeSheetVisible} onClose={() => setIsSelectTypeSheetVisible(false)} onSelect={handleSelectType} />
            <ConfigureWalletBottomSheet
                isVisible={isConfigureSheetVisible}
                selectedWallets={selectedWalletTypes}
                onClose={() => setIsConfigureSheetVisible(false)}
                onConfigure={handleConfigureWallet}
                onFinish={() => { setIsConfigureSheetVisible(false); onDone(); }}
                isLoading={isSavingWallet}
            />
        </>
    );
}
