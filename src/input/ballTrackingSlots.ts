/** Stable positions in the six-slot color-ball tracker (two slots per instrument). */
export const BALL_INSTRUMENTS = ['forceps', 'needleDriver', 'scissors'] as const;
export type BallInstrumentName = (typeof BALL_INSTRUMENTS)[number];
export type BallSide = 0 | 1;

/** Resolve the color/centroid slot for the currently selected instrument and ball A/B. */
export function ballTrackingSlot(instrument: BallInstrumentName, side: BallSide): number {
 return BALL_INSTRUMENTS.indexOf(instrument) * 2 + side;
}
