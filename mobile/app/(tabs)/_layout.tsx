import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Tabs } from 'expo-router';
import { AddTransactionBottomSheet } from '@/components/add-transaction-bottom-sheet';
import { AddSheet, type AddChoice } from '@/components/add-sheet';
import { FloatingTabBar } from '@/components/ui';
import { getWallets } from '@/lib/wallet-service';

// Context to share the add trigger and dashboard refresh between tabs.
interface TabContextType {
    openAddTransaction: () => void;
    refreshDashboard: () => void;
    setRefreshDashboard: (fn: () => void) => void;
}

const TabContext = createContext<TabContextType | null>(null);

export const useTabContext = () => useContext(TabContext);

/**
 * v1 navigation shell (handoff §6): three tabs (Spending, Wallets, Insights)
 * plus a floating Add button. Settings is no longer a tab; it opens from the
 * avatar on Spending. Transactions lives here as a hidden route so the tab bar
 * stays visible with Spending highlighted.
 */
export default function TabLayout() {
    const [addSheetVisible, setAddSheetVisible] = useState(false);
    const [formVisible, setFormVisible] = useState(false);
    const [prefill, setPrefill] = useState<{ type?: 'expense'; walletId?: string } | undefined>();
    const refreshFnRef = useRef<() => void>(() => {});

    const contextValue: TabContextType = useMemo(() => ({
        openAddTransaction: () => setAddSheetVisible(true),
        refreshDashboard: () => refreshFnRef.current(),
        setRefreshDashboard: (fn) => { refreshFnRef.current = fn; },
    }), []);

    const onChoose = useCallback(async (choice: AddChoice) => {
        if (choice === 'cash') {
            // Preselect the first cash wallet, if there is one.
            const cash = (await getWallets()).find((w) => w.type === 'cash');
            setPrefill({ type: 'expense', walletId: cash?.id });
        } else {
            setPrefill(undefined);
        }
        setFormVisible(true);
    }, []);

    return (
        <TabContext.Provider value={contextValue}>
            <Tabs
                backBehavior="history"
                screenOptions={{ headerShown: false }}
                tabBar={(props) => <FloatingTabBar {...props} onAdd={() => setAddSheetVisible(true)} />}
            >
                <Tabs.Screen name="index" options={{ title: 'Spending' }} />
                <Tabs.Screen name="wallets" options={{ title: 'Wallets' }} />
                <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
                <Tabs.Screen name="transactions" options={{ title: 'Transactions', href: null }} />
            </Tabs>

            <AddSheet visible={addSheetVisible} onClose={() => setAddSheetVisible(false)} onChoose={onChoose} />
            <AddTransactionBottomSheet
                isVisible={formVisible}
                prefill={prefill}
                onClose={() => setFormVisible(false)}
                onSuccess={() => refreshFnRef.current()}
            />
        </TabContext.Provider>
    );
}
