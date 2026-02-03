import React, { useCallback, useMemo, useRef, useState } from 'react';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';

import { MomoStep } from './configure-wallet/momo-step';
import { BankStep } from './configure-wallet/bank-step';
import { CashStep } from './configure-wallet/cash-step';
import { LinkingStep } from './configure-wallet/linking-step';
import { PreviewStep } from './configure-wallet/preview-step';

interface Props {
    isVisible: boolean;
    selectedWallets: string[];
    onClose: () => void;
    onConfigure: (data: any) => void;
    isLoading?: boolean;
    initialBalanceFromTransaction?: string;
    onFinish: () => void;
}

type Step = 'momo' | 'bank' | 'cash' | 'linking' | 'preview';

export function ConfigureWalletBottomSheet({ isVisible, selectedWallets, onClose, onConfigure, onFinish, isLoading, initialBalanceFromTransaction }: Props) {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [currentStep, setCurrentStep] = useState<Step>('momo');
    const [hasStartedLinking, setHasStartedLinking] = useState(false);
    const [lastVisible, setLastVisible] = useState(false);
    const wasConfigureCalled = useRef(false);
    const snapPoints = useMemo(() => ['50%', '95%'], []);

    // State for all wallets
    const [momoProvider, setMomoProvider] = useState<string | null>(null);
    const [momoBalance, setMomoBalance] = useState('0.00');
    const [momoIsIncome, setMomoIsIncome] = useState(false);
    const [momoSelection, setMomoSelection] = useState<any>(undefined);

    const [bankName, setBankName] = useState('');
    const [bankBalance, setBankBalance] = useState('0.00');
    const [bankIsIncome, setBankIsIncome] = useState(false);
    const [bankSelection, setBankSelection] = useState<any>(undefined);

    const [cashName, setCashName] = useState('');
    const [cashBalance, setCashBalance] = useState('0.00');
    const [cashIsIncome, setCashIsIncome] = useState(false);
    const [cashSelection, setCashSelection] = useState<any>(undefined);

    // Dynamic Step Sequence
    const stepSequence = useMemo(() => {
        const order: Step[] = ['momo', 'bank', 'cash'];
        const filtered = order.filter(s => selectedWallets.includes(s));
        return [...filtered, 'linking' as Step, 'preview' as Step];
    }, [selectedWallets]);

    const currentStepIndex = stepSequence.indexOf(currentStep);
    const totalSteps = stepSequence.length - 2;
    const stepLabel = (currentStep === 'preview' || currentStep === 'linking') ? '' : `Step ${currentStepIndex + 1} of ${totalSteps}`;

    const handleNext = () => {
        const nextStep = stepSequence[currentStepIndex + 1];
        if (nextStep) {
            setCurrentStep(nextStep);
            if (nextStep === 'linking') setHasStartedLinking(true);
        }
    };

    // Trigger configuration save
    React.useEffect(() => {
        if (currentStep === 'linking' && hasStartedLinking && !wasConfigureCalled.current) {
            wasConfigureCalled.current = true;
            onConfigure({
                momo: selectedWallets.includes('momo') ? { provider: momoProvider, balance: momoBalance, isIncome: momoIsIncome } : null,
                bank: selectedWallets.includes('bank') ? { name: bankName, balance: bankBalance, isIncome: bankIsIncome } : null,
                cash: selectedWallets.includes('cash') ? { name: cashName, balance: cashBalance, isIncome: cashIsIncome } : null
            });
        }
    }, [currentStep, hasStartedLinking, onConfigure, selectedWallets, momoProvider, momoBalance, momoIsIncome, bankName, bankBalance, bankIsIncome, cashName, cashBalance, cashIsIncome]);

    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1) onClose();
    }, [onClose]);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                transparent={true}
                opacity={0.5}
            />
        ),
        []
    );

    React.useEffect(() => {
        if (isVisible && !lastVisible) {
            bottomSheetRef.current?.snapToIndex(0);
            const firstStep = stepSequence[0];
            setCurrentStep(firstStep);

            if (initialBalanceFromTransaction) {
                const formatted = parseFloat(initialBalanceFromTransaction).toFixed(2);
                if (firstStep === 'momo') setMomoBalance(formatted);
                else if (firstStep === 'bank') setBankBalance(formatted);
                else if (firstStep === 'cash') setCashBalance(formatted);
            }
            setHasStartedLinking(false);
            wasConfigureCalled.current = false;
        } else if (!isVisible && lastVisible) {
            bottomSheetRef.current?.close();
            if (!initialBalanceFromTransaction) {
                setMomoBalance('0.00');
                setBankBalance('0.00');
                setCashBalance('0.00');
            }
            setHasStartedLinking(false);
            wasConfigureCalled.current = false;
        }
        setLastVisible(isVisible);
    }, [isVisible, stepSequence, initialBalanceFromTransaction, lastVisible]);

    React.useEffect(() => {
        if (currentStep === 'linking' && hasStartedLinking && !isLoading) {
            const timer = setTimeout(() => setCurrentStep('preview'), 1500);
            return () => clearTimeout(timer);
        }
    }, [currentStep, isLoading, hasStartedLinking]);

    const totalBalance = useMemo(() => {
        const momo = selectedWallets.includes('momo') ? (parseFloat(momoBalance) || 0) : 0;
        const bank = selectedWallets.includes('bank') ? (parseFloat(bankBalance) || 0) : 0;
        const cash = selectedWallets.includes('cash') ? (parseFloat(cashBalance) || 0) : 0;
        return momo + bank + cash;
    }, [momoBalance, bankBalance, cashBalance, selectedWallets]);

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            keyboardBehavior="extend"
            keyboardBlurBehavior="none"
            backgroundStyle={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32 }}
            handleIndicatorStyle={{ backgroundColor: '#EDEDED', width: 60, height: 4 }}
        >
            <BottomSheetView style={{ flex: 1, paddingHorizontal: 29 }}>
                {currentStep === 'momo' && (
                    <MomoStep
                        provider={momoProvider}
                        setProvider={setMomoProvider}
                        balance={momoBalance}
                        setBalance={setMomoBalance}
                        isIncome={momoIsIncome}
                        setIsIncome={setMomoIsIncome}
                        onNext={handleNext}
                        stepLabel={stepLabel}
                        isLastStep={currentStepIndex === totalSteps - 1}
                        selection={momoSelection}
                        setSelection={setMomoSelection}
                    />
                )}
                {currentStep === 'bank' && (
                    <BankStep
                        name={bankName}
                        setName={setBankName}
                        balance={bankBalance}
                        setBalance={setBankBalance}
                        isIncome={bankIsIncome}
                        setIsIncome={setBankIsIncome}
                        onNext={handleNext}
                        stepLabel={stepLabel}
                        isLastStep={currentStepIndex === totalSteps - 1}
                        selection={bankSelection}
                        setSelection={setBankSelection}
                    />
                )}
                {currentStep === 'cash' && (
                    <CashStep
                        name={cashName}
                        setName={setCashName}
                        balance={cashBalance}
                        setBalance={setCashBalance}
                        isIncome={cashIsIncome}
                        setIsIncome={setCashIsIncome}
                        onNext={handleNext}
                        stepLabel={stepLabel}
                        isLastStep={currentStepIndex === totalSteps - 1}
                        selection={cashSelection}
                        setSelection={setCashSelection}
                    />
                )}
                {currentStep === 'linking' && <LinkingStep />}
                {currentStep === 'preview' && (
                    <PreviewStep
                        selectedWallets={selectedWallets}
                        momoProvider={momoProvider}
                        momoBalance={momoBalance}
                        bankName={bankName}
                        bankBalance={bankBalance}
                        cashName={cashName}
                        cashBalance={cashBalance}
                        totalBalance={totalBalance}
                        onFinish={onFinish}
                        onEdit={() => {
                            wasConfigureCalled.current = false;
                            setCurrentStep(stepSequence[0]);
                        }}
                    />
                )}
            </BottomSheetView>
        </BottomSheet>
    );
}

