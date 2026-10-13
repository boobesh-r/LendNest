/**
 * Formats a monetary number in Indian Rupees (INR) using Intl.NumberFormat API with locale 'en-IN'.
 * Produces clean Indian currency formatting, e.g.: ₹500, ₹1,250, ₹12,500.
 */
export function formatINR(
  amount: number | string | undefined | null,
  options?: {
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  }
): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  const safeNum = isNaN(num) ? 0 : num;

  const isInteger = Number.isInteger(safeNum);
  const minDigits = options?.minimumFractionDigits ?? (isInteger ? 0 : 2);
  const maxDigits = options?.maximumFractionDigits ?? (isInteger ? 0 : 2);

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  }).format(safeNum);
}
