import { useEffect } from 'react';
import { useSequencerStore } from '../store/useSequencerStore';

export const useRemoteKeyboard = () => {
    const {
        isLocked,
        keyboardBindings,
        initializeKeyboardBindings,
        nextEvent,
        nextScene,
        nextAct,
        addToast,
        activeShow,
        setCurrentScriptPage,
        blinkingNextEvent,
        blinkingNextScene,
        blinkingNextAct,
        setActiveEvent,
        activeEventIndex,
        setStopButtonFlashRequest
    } = useSequencerStore();

    useEffect(() => {
        initializeKeyboardBindings();
    }, [initializeKeyboardBindings]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input or textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            const key = e.key;

            // 1. Direct PageUp / PageDown for PDF Scrolling (Always available if show is loaded)
            if (key === 'PageUp') {
                e.preventDefault();
                if (activeShow?.viewState?.currentScriptPage) {
                    const newPage = Math.max(1, activeShow.viewState.currentScriptPage - 1);
                    setCurrentScriptPage(newPage);
                    console.log(`[RemoteKeyboard] PgUp -> Page ${newPage}`);
                }
                return;
            }
            if (key === 'PageDown') {
                e.preventDefault();
                if (activeShow?.viewState?.currentScriptPage) {
                    const total = activeShow.totalPages || 999;
                    const newPage = Math.min(total, activeShow.viewState.currentScriptPage + 1);
                    setCurrentScriptPage(newPage);
                    console.log(`[RemoteKeyboard] PgDn -> Page ${newPage}`);
                }
                return;
            }

            // Only remaining shortcuts/bindings are active in Show Mode (Locked)
            if (!isLocked) return;

            // 2. Space key for blinking action
            if (key === ' ') {
                e.preventDefault();
                if (blinkingNextEvent) {
                    console.log('[RemoteKeyboard] Space -> Triggering Next Event');
                    nextEvent();
                } else if (blinkingNextScene) {
                    console.log('[RemoteKeyboard] Space -> Triggering Next Scene');
                    nextScene();
                } else if (blinkingNextAct) {
                    console.log('[RemoteKeyboard] Space -> Triggering Next Act');
                    nextAct();
                }
                return;
            }

            // 3. Escape: vraag expliciet Stop (geen directe stop; tweede Escape ook niet)
            if (key === 'Escape') {
                if (activeEventIndex < 0) return;
                e.preventDefault();
                const already = useSequencerStore.getState().stopButtonFlashRequest;
                setStopButtonFlashRequest(true);
                if (!already) {
                    addToast('Druk op Stop om de show te beëindigen', 'info');
                }
                return;
            }

            // 4. Custom Bindings
            const binding = keyboardBindings.find(b => {
                const keyMatch = key.toLowerCase() === b.key.toLowerCase();
                const ctrlMatch = e.ctrlKey === b.ctrl;
                const shiftMatch = e.shiftKey === b.shift;
                const altMatch = e.altKey === b.alt;
                return keyMatch && ctrlMatch && shiftMatch && altMatch;
            });

            if (binding) {
                // pageUp/pageDown actions are allowed even if not locked
                if (binding.action === 'pageUp') {
                    e.preventDefault();
                    if (activeShow?.viewState?.currentScriptPage) {
                        const newPage = Math.max(1, activeShow.viewState.currentScriptPage - 1);
                        setCurrentScriptPage(newPage);
                    }
                    return;
                }
                if (binding.action === 'pageDown') {
                    e.preventDefault();
                    if (activeShow?.viewState?.currentScriptPage) {
                        const total = activeShow.totalPages || 999;
                        const newPage = Math.min(total, activeShow.viewState.currentScriptPage + 1);
                        setCurrentScriptPage(newPage);
                    }
                    return;
                }

                // All other bindings require Show Mode
                if (!isLocked) return;

                e.preventDefault();
                console.log(`[RemoteKeyboard] Triggering custom action: ${binding.action} for key: ${binding.key}`);

                switch (binding.action) {
                    case 'nextEvent':
                        nextEvent(true);
                        break;
                    case 'nextScene':
                        nextScene(true);
                        break;
                    case 'nextAct':
                        nextAct(true);
                        break;
                    case 'nextSmart':
                        if (blinkingNextEvent) nextEvent();
                        else if (blinkingNextScene) nextScene();
                        else if (blinkingNextAct) nextAct();
                        break;
                    case 'stopAll':
                        addToast('Remote: EMERGENCY STOP', 'error');
                        setActiveEvent(-1);
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isLocked, keyboardBindings, nextEvent, nextScene, nextAct, addToast, activeShow, setCurrentScriptPage, blinkingNextEvent, blinkingNextScene, blinkingNextAct, setActiveEvent, activeEventIndex, setStopButtonFlashRequest]);
};
