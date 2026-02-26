import type { AppSlice } from './slices/appSlice';
import type { DeviceSlice } from './slices/deviceSlice';
import type { MediaSlice } from './slices/mediaSlice';
import type { SequenceSlice } from './slices/sequenceSlice';

/**
 * Union type of all state slices.
 */
export type ShowState = DeviceSlice & MediaSlice & SequenceSlice & AppSlice;
