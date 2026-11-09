import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    Add01Icon, Alert02Icon, AiMagicIcon, ArrowDataTransferHorizontalIcon, ArrowDown01Icon,
    ArrowDownLeft01Icon, ArrowLeft01Icon, ArrowRight01Icon, ArrowUpRight01Icon, BankIcon,
    BubbleChatAddIcon, BubbleChatSparkIcon, Calendar03Icon, Cancel01Icon, Coins01Icon,
    Copy01Icon, Delete02Icon, Download04Icon, Edit02Icon, FaceIdIcon, FilterHorizontalIcon,
    FlashIcon, HelpCircleIcon, Home01Icon, Idea01Icon, InboxIcon, InformationCircleIcon,
    Invoice01Icon, KeyboardIcon, Logout03Icon, Mail01Icon, Message01Icon, Mic01Icon, Money03Icon,
    Moon02Icon, MoreHorizontalIcon, Notification03Icon, PieChartIcon, Refresh01Icon, Restaurant01Icon,
    Search01Icon, SentIcon, Settings02Icon, Share08Icon, Shield01Icon, ShoppingBag02Icon,
    SmartPhone01Icon, SquareLock02Icon, StopIcon, Sun03Icon, Car01Icon, Tag01Icon,
    TaskDone01Icon, Tick02Icon, UserGroupIcon, UserIcon, Wallet03Icon, WifiOff01Icon,
    RepeatIcon,
} from '@hugeicons/core-free-icons';
import { ICON_STROKE } from '@/constants/theme';
import { useTheme } from '@/lib/theme';

/**
 * Figma icon library keys (node 997:2, "Icons · Hugeicons stroke rounded")
 * mapped to Hugeicons exports. Use the Figma key in code so design and code
 * stay searchable against each other.
 */
export const ICONS = {
    airtime: SmartPhone01Icon,
    alert: Alert02Icon,
    back: ArrowLeft01Icon,
    bank: BankIcon,
    bell: Notification03Icon,
    bills: Invoice01Icon,
    calendar: Calendar03Icon,
    cash: Money03Icon,
    check: TaskDone01Icon,
    close: Cancel01Icon,
    copy: Copy01Icon,
    down: ArrowDown01Icon,
    download: Download04Icon,
    edit: Edit02Icon,
    faceid: FaceIdIcon,
    fees: Tag01Icon,
    filter: FilterHorizontalIcon,
    flash: FlashIcon,
    food: Restaurant01Icon,
    help: HelpCircleIcon,
    home: Home01Icon,
    idea: Idea01Icon,
    inbox: InboxIcon,
    info: InformationCircleIcon,
    insights: BubbleChatSparkIcon,
    keyboard: KeyboardIcon,
    loans: Coins01Icon,
    lock: SquareLock02Icon,
    mail: Mail01Icon,
    logout: Logout03Icon,
    message: Message01Icon,
    mic: Mic01Icon,
    moon: Moon02Icon,
    more: MoreHorizontalIcon,
    moved: ArrowDataTransferHorizontalIcon,
    next: ArrowRight01Icon,
    paste: BubbleChatAddIcon,
    people: UserGroupIcon,
    pieChart: PieChartIcon,
    plus: Add01Icon,
    receive: ArrowDownLeft01Icon,
    refresh: Refresh01Icon,
    search: Search01Icon,
    send: SentIcon,
    sent: ArrowUpRight01Icon,
    settings: Settings02Icon,
    share: Share08Icon,
    shield: Shield01Icon,
    shopping: ShoppingBag02Icon,
    sparkle: AiMagicIcon,
    stop: StopIcon,
    subscription: RepeatIcon,
    sun: Sun03Icon,
    tick: Tick02Icon,
    transport: Car01Icon,
    trash: Delete02Icon,
    user: UserIcon,
    wallet: Wallet03Icon,
    wifiOff: WifiOff01Icon,
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
    name: IconName;
    /** 16, 18, 20 or 24 per the handoff; other sizes allowed for tiles. */
    size?: number;
    /** Defaults to text.primary. Pass a token value from useTheme().colors. */
    color?: string;
    strokeWidth?: number;
}

export function Icon({ name, size = 20, color, strokeWidth = ICON_STROKE }: IconProps) {
    const { colors } = useTheme();
    return (
        <HugeiconsIcon
            icon={ICONS[name]}
            size={size}
            color={color ?? colors.text.primary}
            strokeWidth={strokeWidth}
        />
    );
}
