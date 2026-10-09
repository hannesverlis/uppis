export function isArrivalLate(from: string, minutes: number, now = Date.now()) {
  return now > new Date(from).getTime() + minutes * 60 * 1000;
}
