/* Mannru card numbers — 16 digits:
 *   67            brand BIN (the meme)
 *   XX            tier code (01..05)
 *   6/7 6/7 6/7 6/7   alternating skeleton
 *   XXX           random
 *   X             Luhn check digit
 */

function luhnCheckDigit(partial: string): string {
  let sum = 0
  const digits = partial.split('').map(Number)

  for (let i = 0; i < digits.length; i++) {
    let digit = digits[i]!
    if (i % 2 === 0) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }
    sum += digit
  }

  return String((10 - (sum % 10)) % 10)
}

export function generateCardNumber(tierLevel: number): string {
  const tierCode = String(Math.max(1, Math.min(99, tierLevel))).padStart(2, '0')

  let skeleton = ''
  for (let i = 0; i < 4; i++) {
    skeleton += Math.random() < 0.5 ? '6' : '7'
    skeleton += String(Math.floor(Math.random() * 10))
  }

  let random = ''
  for (let i = 0; i < 3; i++) {
    random += String(Math.floor(Math.random() * 10))
  }

  const partial = `67${tierCode}${skeleton}${random}`

  return partial + luhnCheckDigit(partial)
}

export function formatCardNumber(number: string | null | undefined): string {
  if (!number) {
    return ''
  }
  return number.replace(/(\d{4})(?=\d)/g, '$1 ')
}
