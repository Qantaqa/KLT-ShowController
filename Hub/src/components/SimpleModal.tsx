import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Check } from 'lucide-react'

interface SimpleModalProps {
    isOpen: boolean
    title: string
    message: string
    type: 'confirm' | 'prompt'
    defaultValue?: string
    onConfirm: (value?: string) => void
    onCancel?: () => void
    onClose?: () => void
    confirmLabel?: string
    cancelLabel?: string
}

const SimpleModal: React.FC<SimpleModalProps> = ({
    isOpen,
    title,
    message,
    type,
    defaultValue = '',
    onConfirm,
    onCancel,
    confirmLabel = 'Bevestigen',
    cancelLabel = 'Annuleren'
}) => {
    const [inputValue, setInputValue] = useState(defaultValue)

    useEffect(() => {
        if (isOpen) {
            setInputValue(defaultValue)
        }
    }, [isOpen, defaultValue])

    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="glass w-full max-w-sm flex flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3 bg-white/5">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold">{title}</h2>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {message}
                    </p>

                    {type === 'prompt' && (
                        <input
                            autoFocus
                            title="Invoer"
                            placeholder="Typ hier..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 focus:bg-white/10 transition-all"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onConfirm(inputValue)
                                if (e.key === 'Escape') onCancel?.()
                            }}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between gap-3 bg-white/5">
                    <button
                        onClick={() => onCancel?.()}
                        className="px-4 py-2 rounded-lg hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest transition-all text-white/60 hover:text-white"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={() => onConfirm(type === 'prompt' ? inputValue : undefined)}
                        className="px-6 py-2 rounded-lg bg-primary hover:bg-primary/80 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                    >
                        <Check className="w-3.5 h-3.5" /> {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.getElementById('portal-root')!
    )
}

export default SimpleModal
