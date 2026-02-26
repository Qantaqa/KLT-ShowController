import React, { useState, useEffect } from 'react';
import { Keyboard, Command, Play, Square, ChevronUp, ChevronDown, Save, RefreshCw } from 'lucide-react';
import { useSequencerStore } from '../store/useSequencerStore';
import type { KeyboardBinding } from '../types/show';
import { cn } from '../lib/utils';

const KeyboardSettings: React.FC = () => {
    const { keyboardBindings, updateKeyboardBindings, addToast } = useSequencerStore();
    const [localBindings, setLocalBindings] = useState<KeyboardBinding[]>(keyboardBindings);
    const [recordingId, setRecordingId] = useState<string | null>(null);

    useEffect(() => {
        setLocalBindings(keyboardBindings);
    }, [keyboardBindings]);

    useEffect(() => {
        if (!recordingId) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // We only care about the key itself, but we display the modifiers
            const key = e.key;
            if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return;

            setLocalBindings(prev => prev.map(b =>
                b.id === recordingId
                    ? { ...b, key: key, ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey }
                    : b
            ));
            setRecordingId(null);
            addToast(`Toets geregistreerd: ${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.altKey ? 'Alt+' : ''}${key}`, 'info');
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [recordingId, addToast]);

    const handleSave = async () => {
        try {
            await updateKeyboardBindings(localBindings);
            addToast('Toetsenbord instellingen opgeslagen', 'info');
        } catch {
            addToast('Fout bij opslaan van toetsenbord instellingen', 'error');
        }
    };

    const actionOptions = [
        { value: 'nextEvent', label: 'Volgende Event', icon: Play },
        { value: 'nextScene', label: 'Volgende Scene', icon: Play },
        { value: 'nextAct', label: 'Volgende Act', icon: Play },
        { value: 'nextSmart', label: 'Smart Advance (Blinks)', icon: Play },
        { value: 'stopAll', label: 'Emergency Stop', icon: Square, color: 'text-red-500' },
        { value: 'pageUp', label: 'Script Pagina +', icon: ChevronUp },
        { value: 'pageDown', label: 'Script Pagina -', icon: ChevronDown },
    ];

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Keyboard className="w-5 h-5 text-primary" /> Sayodevice / Remote Keyboard
                    </h3>
                    <p className="text-sm opacity-40">
                        Configureer de 6 knoppen van je Sayodevice RFU_2X3M of een ander programmeerbaar toetsenbord.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                    <Save className="w-3.5 h-3.5" /> Opslaan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {localBindings.map((binding, index) => (
                    <div
                        key={binding.id}
                        className={cn(
                            "glass border p-4 rounded-xl space-y-4 transition-all",
                            recordingId === binding.id ? "border-primary bg-primary/5 ring-1 ring-primary/50" : "border-white/10 hover:border-white/20"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Knop {index + 1}</span>
                            <div className="flex items-center gap-1">
                                {binding.ctrl && <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-mono opacity-60">CTRL</span>}
                                {binding.shift && <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-mono opacity-60">SHIFT</span>}
                                {binding.alt && <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-mono opacity-60">ALT</span>}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Key Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Toets</label>
                                <button
                                    onClick={() => setRecordingId(binding.id)}
                                    className={cn(
                                        "w-full h-10 rounded-lg border flex items-center justify-center gap-2 transition-all font-mono text-sm",
                                        recordingId === binding.id
                                            ? "bg-primary border-primary text-white animate-pulse"
                                            : "bg-black/20 border-white/10 hover:bg-black/40"
                                    )}
                                >
                                    {recordingId === binding.id ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Druk op een toets...
                                        </>
                                    ) : (
                                        <>
                                            <Command className="w-4 h-4 opacity-40" />
                                            {binding.key || 'Geen toets'}
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Action Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Actie</label>
                                <select
                                    value={binding.action}
                                    title="Selecteer actie"
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLocalBindings(prev => prev.map(b => b.id === binding.id ? { ...b, action: e.target.value as KeyboardBinding['action'] } : b))}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
                                >
                                    {actionOptions.map(opt => (
                                        <option key={opt.value} value={opt.value} className="bg-neutral-900">
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 p-4 bg-white/5 border border-white/5 rounded-xl space-y-2">
                <p className="text-xs font-bold opacity-60 flex items-center gap-2">
                    <Command className="w-3.5 h-3.5" /> Hoe werkt het?
                </p>
                <ul className="text-[11px] opacity-40 space-y-1 list-disc ml-4">
                    <li>Klik op een knop hierboven om een toetscombinatie te "leren".</li>
                    <li>Druk op de fysieke knop op je Sayodevice om de combinatie vast te leggen.</li>
                    <li>Vergeet niet op 'Opslaan' te klikken om de wijzigingen te bewaren in de database.</li>
                    <li>Sneltoetsen (behalve script navigatie) werken alleen in Show Mode.</li>
                </ul>
            </div>
        </div>
    );
};

export default KeyboardSettings;
