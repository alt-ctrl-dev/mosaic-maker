export type TesseraSizeValidationResult =
  | {
      valid: true;
      adjustedSize: number;
      gridCells: number;
      coarse: boolean;
      width: number;
      height: number;
    }
  | {
      valid: false;
      reason: string;
    };

/**
 * Find the greatest common divisor of two numbers
 */
// function gcd(a: number, b: number): number {
//   while (b !== 0) {
//     const temp = b;
//     b = a % b;
//     a = temp;
//   }
//   return a;
// }

/**
 * Find all divisors of a number
 */
function getDivisors(n: number): number[] {
  const divisors: number[] = [];
  for (let i = 1; i <= Math.sqrt(n); i++) {
    if (n % i === 0) {
      divisors.push(i);
      if (i !== n / i) {
        divisors.push(n / i);
      }
    }
  }
  return divisors.sort((a, b) => a - b);
}

/**
 * Find common divisors of two numbers
 */
function getCommonDivisors(width: number, height: number): number[] {
  const widthDivisors = getDivisors(width);
  const heightDivisors = getDivisors(height);

  // Find intersection
  return widthDivisors.filter((divisor) => heightDivisors.includes(divisor));
}

/**
 * Calculate the adjusted tessera size based on requested size and image dimensions
 */
export function calculateAdjustedTesseraSize(
  requestedSize: number,
  width: number,
  height: number
): number {
  const commonDivisors = getCommonDivisors(width, height);

  // Filter out divisors below minimum size
  const validDivisors = commonDivisors.filter((divisor) => divisor >= 8);

  if (validDivisors.length === 0) {
    // This case should be caught by validateTesseraSize, but return a default
    return 8;
  }

  // Find the closest valid divisor to the requested size
  let bestDivisor = validDivisors[0];
  let bestDistance = Math.abs(requestedSize - bestDivisor);

  for (let i = 1; i < validDivisors.length; i++) {
    const divisor = validDivisors[i];
    const distance = Math.abs(requestedSize - divisor);

    // If equal distance, prefer the smaller size
    if (
      distance < bestDistance ||
      (distance === bestDistance && divisor < bestDivisor)
    ) {
      bestDivisor = divisor;
      bestDistance = distance;
    }
  }

  return bestDivisor;
}

/**
 * Validate a tessera size for given image dimensions
 */
export function validateTesseraSize(
  requestedSize: number,
  width: number,
  height: number
): TesseraSizeValidationResult {
  // Find common divisors of both dimensions
  const commonDivisors = getCommonDivisors(width, height);

  // Filter out divisors below minimum size (8px)
  const validDivisors = commonDivisors.filter((divisor) => divisor >= 8);

  if (validDivisors.length === 0) {
    return {
      valid: false,
      reason: `No valid tessera size found that divides both dimensions and is at least 8px.`,
    };
  }

  const adjustedSize = calculateAdjustedTesseraSize(
    requestedSize,
    width,
    height
  );

  if (adjustedSize < 8) {
    return {
      valid: false,
      reason: `Adjusted tessera size ${adjustedSize}px is below the minimum of 8px.`,
    };
  }

  // Calculate grid cells
  const gridWidth = Math.floor(width / adjustedSize);
  const gridHeight = Math.floor(height / adjustedSize);
  const gridCells = gridWidth * gridHeight;

  // Check if grid is coarse (fewer than 100 cells)
  const coarse = gridCells < 100;

  return {
    valid: true,
    adjustedSize,
    gridCells,
    coarse,
    width,
    height,
  };
}
