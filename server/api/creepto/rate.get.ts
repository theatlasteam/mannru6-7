import { manncoinRate, manncoinRateChange, manncoinOhlc, manncoinOhlcHistory } from '~~/utils/creepto'

export default defineEventHandler(() => {
  const now = Date.now()
  return {
    rate: manncoinRate(now),
    change: manncoinRateChange(now),
    ohlc: manncoinOhlc(now),
    history: manncoinOhlcHistory(now)
  }
})
