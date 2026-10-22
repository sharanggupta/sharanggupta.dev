// Star counts drift a little every day. Only a real move is written, so the ordering stays stable and a
// quiet day changes nothing in the repository.

/** The relative change below which a new star count is ignored. */
export const STARS_THRESHOLD = 0.03;

/** Whether `stars` differs enough from the recorded count to be worth writing. A missing record always is. */
export function starsMoved(recorded, stars) {
  if (recorded === undefined || recorded === null) return true;
  if (recorded === 0) return stars !== 0;
  return Math.abs(stars - recorded) / recorded >= STARS_THRESHOLD;
}
