/** Same Fib day ladder as Alexandria LibraryBuild / Match cards (ORM-16). */
export const K_PARCOUR_FIB_DAYS = [
  1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377,
] as const;

export function fibDaysAtIndex(index: number): number {
  if (index <= 0) return K_PARCOUR_FIB_DAYS[0];
  if (index >= K_PARCOUR_FIB_DAYS.length) {
    return K_PARCOUR_FIB_DAYS[K_PARCOUR_FIB_DAYS.length - 1];
  }
  return K_PARCOUR_FIB_DAYS[index];
}

export function maxFibIndex(): number {
  return K_PARCOUR_FIB_DAYS.length - 1;
}
