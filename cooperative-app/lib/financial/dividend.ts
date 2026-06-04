export interface MemberDividendInput {
  memberId: string;
  sharesHeld: number;
  savingsBalanceKobo: bigint;
}

export interface DividendAllocationResult {
  memberId: string;
  sharesHeld: number;
  savingsBalanceKobo: bigint;
  allocationAmountKobo: bigint;
}

/**
 * Allocates dividend fund proportionally by shares held.
 * Remainder (from rounding) is added to the largest allocation.
 */
export function computeDividendAllocations(
  dividendFundKobo: bigint,
  members: MemberDividendInput[]
): DividendAllocationResult[] {
  const activeMembersWithShares = members.filter((m) => m.sharesHeld > 0);
  if (activeMembersWithShares.length === 0) return [];

  const totalShares = activeMembersWithShares.reduce(
    (sum, m) => sum + m.sharesHeld,
    0
  );
  if (totalShares === 0) return [];

  const fund = Number(dividendFundKobo);
  let allocated = 0n;
  let maxAllocationIdx = 0;
  let maxAmount = 0n;

  const results: DividendAllocationResult[] = activeMembersWithShares.map(
    (m, idx) => {
      const amount = BigInt(
        Math.floor((m.sharesHeld / totalShares) * fund)
      );
      allocated += amount;
      if (amount > maxAmount) {
        maxAmount = amount;
        maxAllocationIdx = idx;
      }
      return {
        memberId: m.memberId,
        sharesHeld: m.sharesHeld,
        savingsBalanceKobo: m.savingsBalanceKobo,
        allocationAmountKobo: amount,
      };
    }
  );

  // Assign rounding remainder to the largest recipient
  const remainder = dividendFundKobo - allocated;
  results[maxAllocationIdx].allocationAmountKobo += remainder;

  return results;
}
