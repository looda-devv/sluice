import type { NoDropBand } from '../data/dws/wsa';

/**
 * Colour for a No Drop band.
 *
 * "No submission" is deliberately grey rather than red. A municipality that
 * did not report is not thereby the worst performer — it is unmeasured, and
 * colouring it as a failure would assert something the data does not say.
 */
export const BAND_TONE: Record<NoDropBand, string> = {
  Excellent: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  Good: 'border-flow-400/30 bg-flow-400/10 text-flow-200',
  Average: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  Poor: 'border-loss-400/40 bg-loss-400/10 text-loss-300',
  'No submission': 'border-white/12 bg-white/[0.04] text-silt-500',
};
