export function calculateEconomics({ setup, monthly, external, months, contribution, eligible }) {
  const inputs = { setup, monthly, external, months, contribution, eligible };
  for (const [name, value] of Object.entries(inputs)) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be a finite non-negative number`);
  }
  if (months <= 0 || contribution <= 0) throw new RangeError('Months and contribution must be greater than zero');
  const monthlyCost = setup / months + monthly + external;
  const breakEven = Math.ceil(monthlyCost / contribution);
  const doubleCost = Math.ceil(monthlyCost * 2 / contribution);
  return {
    monthlyCost,
    totalCost: setup + (monthly + external) * months,
    breakEven,
    doubleCost,
    requiredRate: eligible > 0 ? breakEven / eligible * 100 : null,
    exceedsPool: breakEven > eligible
  };
}
