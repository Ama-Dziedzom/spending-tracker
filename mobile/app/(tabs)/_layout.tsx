import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Tabs } from 'expo-router';
import { AddEntrySheet } from '@/components/transactions/add-entry-sheet';
import { LogCashSheet } from '@/components/transactions/log-cash-sheet';
import { AddSheet, type AddChoice } from '@/components/add-sheet';
import { FloatingTabBar } from '@/components/ui';

// Context to share the add trigger and dashboard refresh between tabs.
interface TabContextType {
    /** Opens the "Add to LogIt" chooser. */
    openAddTransaction: () => void;
    /** Skips the chooser: 'cash' opens Log cash, 'manual' opens Add manually. */
    openAdd: (choice: AddChoice) => void;
    refreshDashboard: () => void;
    setRefreshDashboard: (fn: () => void) => void;
}

const TabContext = createContext<TabContextType | null>(null);

export const useTabContext = () => useContext(TabContext);

/**
 * v1 navigation shell (handoff §6): three tabs (Spending, Wallets, Insights)
 * plus a floating Add button. Settings is no longer a tab; it opens from the
 * avatar on Spending. Each tab has its own stack, so Transactions, a wallet
 * or an insight keep the tab bar and swipe back within the tab.
 */
export default function TabLayout() {
    const [addSheetVisible, setAddSheetVisible] = useState(false);
    const [open, setOpen] = useState<AddChoice | null>(null);
    const refreshFnRef = useRef<() => void>(() => {});

    const onChoose = useCallback((choice: AddChoice) => setOpen(choice), []);

    const contextValue: TabContextType = useMemo(() => ({
        openAddTransaction: () => setAddSheetVisible(true),
        openAdd: (choice) => { onChoose(choice); },
        refreshDashboard: () => refreshFnRef.current(),
        setRefreshDashboard: (fn) => { refreshFnRef.current = fn; },
    }), [onChoose]);

    return (
        <TabContext.Provider value={contextValue}>
            <Tabs
                backBehavior="history"
                screenOptions={{ headerShown: false }}
                tabBar={(props) => <FloatingTabBar {...props} onAdd={() => setAddSheetVisible(true)} />}
            >
                {/* Each tab is its own stack (spending/, wallets/, insights/). */}
                <Tabs.Screen name="spending" options={{ title: 'Spending' }} />
                <Tabs.Screen name="wallets" options={{ title: 'Wallets' }} />
                <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
            </Tabs>

            <AddSheet visible={addSheetVisible} onClose={() => setAddSheetVisible(false)} onChoose={onChoose} />
            <AddEntrySheet visible={open === 'manual'} onClose={() => setOpen(null)} onSuccess={() => refreshFnRef.current()} />
            <LogCashSheet visible={open === 'cash'} onClose={() => setOpen(null)} onSuccess={() => refreshFnRef.current()} />
        </TabContext.Provider>
    );
}
