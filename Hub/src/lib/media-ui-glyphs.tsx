import { Repeat, Volume1 } from 'lucide-react'
import { cn } from './utils'

/** Luidspreker met schuine streep (gedempt / geen geluid). */
export function SpeakerMutedGlyph({ sizeClassName = 'h-3 w-3' }: { sizeClassName?: string }) {
    return (
        <span className={cn('relative inline-flex items-center justify-center', sizeClassName)} aria-hidden>
            <Volume1 className="h-full w-full shrink-0" strokeWidth={2.25} />
            <span
                className="pointer-events-none absolute left-1/2 top-1/2 h-px w-[130%] -translate-x-1/2 -translate-y-1/2 rotate-[-38deg] bg-current opacity-95"
            />
        </span>
    )
}

/** Herhalen uit: zelfde icoon-/lijnkleur als aan; alleen streep onderscheidt. */
export function RepeatToggleGlyph({
    repeatOn,
    sizeClassName = 'h-3 w-3',
}: {
    repeatOn: boolean
    sizeClassName?: string
}) {
    return (
        <span className={cn('relative inline-flex items-center justify-center', sizeClassName)} aria-hidden>
            <Repeat className="h-full w-full shrink-0" strokeWidth={2.25} />
            {!repeatOn && (
                <span className="pointer-events-none absolute left-1/2 top-1/2 h-px w-[140%] -translate-x-1/2 -translate-y-1/2 rotate-[-36deg] bg-current opacity-95" />
            )}
        </span>
    )
}
