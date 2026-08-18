// src/modules/activity/components/ActivityIcon.tsx

import {
    Archive, Banknote, Calendar, Check, Clock, Eye, FileText, GitBranch, GitMerge,
    Image, Link2, Megaphone, MessageSquare, Pencil, PenLine, Phone, Plus, RefreshCw,
    RotateCcw, Send, ShieldAlert, StickyNote, Sun, Trash2, User, UserCog, Wallet,
    Wrench, X, ListChecks,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ActivityIconKey } from '../types';

/**
 * Premium coupe silhouette.
 *
 * Lucide's `car` reads as a toy: wrong register for a studio whose clients drive
 * the vehicles this CRM tracks. Drawn as a low, wide profile with a fast roofline,
 * on the same 24-grid and stroke weight as the Lucide set so it sits flush beside
 * the other icons.
 */
const CoupeIcon = ({ size = 18, ...rest }: { size?: number; className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
    >
        <path d="M2.5 15.2v-1.4a2 2 0 0 1 1.3-1.87l2.6-.96 2.9-2.6A4 4 0 0 1 11.97 7.3h2.2a4 4 0 0 1 2.72 1.07l2.63 2.45 1.6.5A1.6 1.6 0 0 1 22.2 12.9v2.3h-2.1" />
        <path d="M15.6 15.2H8.4" />
        <path d="M4.4 15.2H2.5" />
        <path d="M6.9 10.97h9.9" />
        <circle cx="6.4" cy="15.6" r="1.9" />
        <circle cx="17.6" cy="15.6" r="1.9" />
    </svg>
);

const ICONS: Record<ActivityIconKey, LucideIcon> = {
    CREATE: Plus,
    EDIT: Pencil,
    DELETE: Trash2,
    STATUS: RefreshCw,
    PHOTO: Image,
    DOCUMENT: FileText,
    COMMENT: MessageSquare,
    NOTE: StickyNote,
    SERVICE: Wrench,
    MONEY: Banknote,
    CALENDAR: Calendar,
    // Overridden below by the custom silhouette; kept so the record stays total.
    VEHICLE: Wrench,
    CUSTOMER: User,
    USER: UserCog,
    SECURITY: ShieldAlert,
    MESSAGE: Send,
    CAMPAIGN: Megaphone,
    TIME: Clock,
    SIGNATURE: PenLine,
    PHONE: Phone,
    TASK: ListChecks,
    VIEW: Eye,
    APPROVE: Check,
    REJECT: X,
    ARCHIVE: Archive,
    RESTORE: RotateCcw,
    SPLIT: GitBranch,
    MERGE: GitMerge,
    LEAVE: Sun,
    PAYROLL: Wallet,
    LINK: Link2,
};

interface ActivityIconProps {
    /** Unknown keys fall back to a neutral glyph rather than rendering nothing. */
    icon: ActivityIconKey;
    size?: number;
}

export const ActivityIcon = ({ icon, size = 18 }: ActivityIconProps) => {
    if (icon === 'VEHICLE') return <CoupeIcon size={size} />;

    const Glyph = ICONS[icon] ?? RefreshCw;
    return <Glyph size={size} strokeWidth={1.75} />;
};
