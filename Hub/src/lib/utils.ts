import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind classes safely using clsx and tailwind-merge.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/** Standaard paarse icoonkleur op modal-/formknoppen */
export const modalBtnIconClass = 'h-4 w-4 shrink-0 text-primary'

/** Standaard: donkere achtergrond, grijze rand, hoekige hoofdletters */
export function modalBtnSecondary(...extra: ClassValue[]) {
    return cn(
        'inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-[#14141a] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/80 transition-colors hover:border-white/30 hover:bg-[#1a1a24] hover:text-white disabled:pointer-events-none disabled:opacity-45',
        ...extra
    )
}

/** Voorkeursactie: paarse achtergrond (primary) */
export function modalBtnPrimary(...extra: ClassValue[]) {
    return cn(
        'inline-flex items-center justify-center gap-2 rounded-lg border border-primary/55 bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:opacity-90 disabled:pointer-events-none disabled:opacity-45',
        ...extra
    )
}

/** Destructief (verwijderen): donker + rode rand */
export function modalBtnDanger(...extra: ClassValue[]) {
    return cn(
        'inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/45 bg-[#14141a] px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-100/90 transition-colors hover:bg-red-500/10 hover:border-red-500/55 disabled:pointer-events-none disabled:opacity-45',
        ...extra
    )
}

/** Header sluitknop (icoon),zelfde stijlfamilie */
export function modalHeaderCloseBtn(...extra: ClassValue[]) {
    return cn(
        'inline-flex items-center justify-center rounded-lg border border-white/20 bg-[#14141a] p-2 text-primary transition-colors hover:border-white/30 hover:bg-[#1a1a24]',
        ...extra
    )
}
