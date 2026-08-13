export function mp(amount: number): string {
  return `${Number.isInteger(amount) ? amount : amount.toFixed(1)} МР`
}
