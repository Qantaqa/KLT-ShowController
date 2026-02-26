import { create } from 'zustand';
import { createDeviceSlice } from './slices/deviceSlice';
import type { DeviceSlice } from './slices/deviceSlice';
import { createMediaSlice } from './slices/mediaSlice';
import type { MediaSlice } from './slices/mediaSlice';
import { createSequenceSlice } from './slices/sequenceSlice';
import type { SequenceSlice } from './slices/sequenceSlice';
import { createAppSlice } from './slices/appSlice';
import type { AppSlice } from './slices/appSlice';

/**
 * Union type of all state slices.
 */
export type ShowState = DeviceSlice & MediaSlice & SequenceSlice & AppSlice;

/**
 * The core Sequencer Store.
 * This is the renamed and modularized version of useShowStore.
 */
export const useSequencerStore = create<ShowState>((...a) => ({
    ...createDeviceSlice(...a),
    ...createMediaSlice(...a),
    ...createSequenceSlice(...a),
    ...createAppSlice(...a),
}));

// Wire up the VideoWall Agent service progress callback to the store
import { videoWallAgentService } from '../services/videowall-agent-service';
videoWallAgentService.onProgress((state) => {
    const key = `${state.deviceId}:${state.filename}`;
    useSequencerStore.getState().setTransferProgress(key, state);
});

// Backward compatibility or internal shorthand if needed
// export const useShowStore = useSequencerStore;
