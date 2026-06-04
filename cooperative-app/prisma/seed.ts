import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Default cooperative settings
  const settings = [
    { key: "cooperative_name", value: "Nigerian Workers Cooperative Society", description: "Full name of the cooperative" },
    { key: "cooperative_rc_number", value: "RC-000000", description: "CAC Registration Number" },
    { key: "share_value_kobo", value: "10000", description: "Value of one share unit in kobo (₦100)" },
    { key: "financial_year_start", value: "01-01", description: "Financial year start (MM-DD)" },
    { key: "max_loan_multiplier", value: "3", description: "Maximum loan as multiple of savings" },
    { key: "membership_fee_kobo", value: "500000", description: "One-time membership fee in kobo (₦5,000)" },
  ];

  for (const s of settings) {
    await prisma.cooperativeSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  // Default loan products
  const products = [
    {
      name: "Emergency Loan",
      description: "For urgent personal needs. Quick approval within 48 hours.",
      minAmountKobo: BigInt(5_000_00),   // ₦5,000
      maxAmountKobo: BigInt(100_000_00), // ₦100,000
      interestRatePct: 2.0,
      interestType: "flat" as const,
      maxTenureMonths: 6,
      minTenureMonths: 1,
      processingFeePct: 1.0,
      guarantorsRequired: 1,
      minMembershipMonths: 3,
      savingsMultiplier: 2.0,
    },
    {
      name: "Regular Loan",
      description: "Standard cooperative loan for personal or business purposes.",
      minAmountKobo: BigInt(50_000_00),    // ₦50,000
      maxAmountKobo: BigInt(500_000_00),   // ₦500,000
      interestRatePct: 1.5,
      interestType: "flat" as const,
      maxTenureMonths: 12,
      minTenureMonths: 3,
      processingFeePct: 1.5,
      guarantorsRequired: 2,
      minMembershipMonths: 6,
      savingsMultiplier: 3.0,
    },
    {
      name: "Business Loan",
      description: "For business expansion and capital investment.",
      minAmountKobo: BigInt(200_000_00),    // ₦200,000
      maxAmountKobo: BigInt(2_000_000_00),  // ₦2,000,000
      interestRatePct: 18.0,
      interestType: "reducing_balance" as const,
      maxTenureMonths: 24,
      minTenureMonths: 6,
      processingFeePct: 2.0,
      insuranceFeePct: 0.5,
      guarantorsRequired: 2,
      collateralRequired: true,
      minMembershipMonths: 12,
      savingsMultiplier: 4.0,
    },
  ];

  for (const product of products) {
    const exists = await prisma.loanProduct.findFirst({ where: { name: product.name } });
    if (!exists) {
      await prisma.loanProduct.create({ data: product });
    }
  }

  // Superadmin user
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@cooperative.ng";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@1234";
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existing) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        hashedPassword,
        role: "superadmin",
      },
    });
    console.log(`Superadmin created: ${adminEmail} / ${adminPassword}`);
    console.log("IMPORTANT: Change the default password immediately after first login!");
  }

  console.log("Seed complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
