export interface LoanScheduleItem {
  installmentNumber: number;
  dueDate: Date;
  principalDueKobo: bigint;
  interestDueKobo: bigint;
  totalDueKobo: bigint;
  openingBalanceKobo: bigint;
  closingBalanceKobo: bigint;
}

export interface LoanCalculation {
  principalKobo: bigint;
  interestKobo: bigint;
  processingFeeKobo: bigint;
  insuranceFeeKobo: bigint;
  totalPayableKobo: bigint;
  monthlyInstallmentKobo: bigint;
  schedule: LoanScheduleItem[];
}

/**
 * Flat rate: interest = principal × rate × tenure
 * Equal monthly installments = (principal + total_interest) / tenure
 */
export function calculateFlatRate(
  principalKobo: bigint,
  annualRatePct: number,
  tenureMonths: number,
  disbursementDate: Date,
  processingFeePct = 0,
  insuranceFeePct = 0
): LoanCalculation {
  const monthlyRate = annualRatePct / 100 / 12;
  const totalInterestKobo = BigInt(
    Math.round(Number(principalKobo) * monthlyRate * tenureMonths)
  );
  const processingFeeKobo = BigInt(
    Math.round(Number(principalKobo) * (processingFeePct / 100))
  );
  const insuranceFeeKobo = BigInt(
    Math.round(Number(principalKobo) * (insuranceFeePct / 100))
  );
  const totalPayableKobo = principalKobo + totalInterestKobo;

  const baseInstallment = Number(totalPayableKobo) / tenureMonths;
  const schedule: LoanScheduleItem[] = [];
  let remainingPrincipal = principalKobo;
  let accumulatedPrincipal = 0n;
  let accumulatedInterest = 0n;

  for (let i = 1; i <= tenureMonths; i++) {
    const dueDate = new Date(disbursementDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    const isLast = i === tenureMonths;
    let interestDueKobo: bigint;
    let principalDueKobo: bigint;

    if (isLast) {
      interestDueKobo = totalInterestKobo - accumulatedInterest;
      principalDueKobo = principalKobo - accumulatedPrincipal;
    } else {
      interestDueKobo = BigInt(
        Math.round(Number(totalInterestKobo) / tenureMonths)
      );
      principalDueKobo = BigInt(
        Math.round(Number(principalKobo) / tenureMonths)
      );
    }

    const totalDueKobo = principalDueKobo + interestDueKobo;
    accumulatedPrincipal += principalDueKobo;
    accumulatedInterest += interestDueKobo;

    schedule.push({
      installmentNumber: i,
      dueDate,
      principalDueKobo,
      interestDueKobo,
      totalDueKobo,
      openingBalanceKobo: remainingPrincipal,
      closingBalanceKobo: remainingPrincipal - principalDueKobo,
    });

    remainingPrincipal -= principalDueKobo;
  }

  return {
    principalKobo,
    interestKobo: totalInterestKobo,
    processingFeeKobo,
    insuranceFeeKobo,
    totalPayableKobo: totalPayableKobo + processingFeeKobo + insuranceFeeKobo,
    monthlyInstallmentKobo: BigInt(Math.round(baseInstallment)),
    schedule,
  };
}

/**
 * Reducing balance: interest is computed on outstanding balance each period
 * Uses standard EMI formula: EMI = P × r × (1+r)^n / ((1+r)^n - 1)
 */
export function calculateReducingBalance(
  principalKobo: bigint,
  annualRatePct: number,
  tenureMonths: number,
  disbursementDate: Date,
  processingFeePct = 0,
  insuranceFeePct = 0
): LoanCalculation {
  const monthlyRate = annualRatePct / 100 / 12;
  const principal = Number(principalKobo);

  let emiKobo: bigint;
  if (monthlyRate === 0) {
    emiKobo = BigInt(Math.round(principal / tenureMonths));
  } else {
    const factor = Math.pow(1 + monthlyRate, tenureMonths);
    const emi = (principal * monthlyRate * factor) / (factor - 1);
    emiKobo = BigInt(Math.round(emi));
  }

  const processingFeeKobo = BigInt(
    Math.round(principal * (processingFeePct / 100))
  );
  const insuranceFeeKobo = BigInt(
    Math.round(principal * (insuranceFeePct / 100))
  );

  const schedule: LoanScheduleItem[] = [];
  let balance = principal;
  let totalInterest = 0;

  for (let i = 1; i <= tenureMonths; i++) {
    const dueDate = new Date(disbursementDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    const interestForPeriod = balance * monthlyRate;
    const isLast = i === tenureMonths;

    let interestDueKobo: bigint;
    let principalDueKobo: bigint;

    if (isLast) {
      interestDueKobo = BigInt(Math.round(interestForPeriod));
      principalDueKobo = BigInt(Math.round(balance));
    } else {
      interestDueKobo = BigInt(Math.round(interestForPeriod));
      principalDueKobo = emiKobo - interestDueKobo;
    }

    const openingBalanceKobo = BigInt(Math.round(balance));
    balance = balance - Number(principalDueKobo);
    totalInterest += Number(interestDueKobo);

    schedule.push({
      installmentNumber: i,
      dueDate,
      principalDueKobo,
      interestDueKobo,
      totalDueKobo: principalDueKobo + interestDueKobo,
      openingBalanceKobo,
      closingBalanceKobo: BigInt(Math.round(Math.max(0, balance))),
    });
  }

  const totalInterestKobo = BigInt(Math.round(totalInterest));

  return {
    principalKobo,
    interestKobo: totalInterestKobo,
    processingFeeKobo,
    insuranceFeeKobo,
    totalPayableKobo:
      principalKobo +
      totalInterestKobo +
      processingFeeKobo +
      insuranceFeeKobo,
    monthlyInstallmentKobo: emiKobo,
    schedule,
  };
}
