/**
 * Leave an in-progress knock and return to Photo.
 * The scan draft is unchanged. This does not write history.
 */
export function backFromKnock<T extends { step: string }>(state: T): T {
  if (state.step !== 'knock') {
    return state;
  }
  return { ...state, step: 'photo' } as T;
}
