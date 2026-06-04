/**
 * localStorage-based data layer — no backend required.
 * All monetary values are stored as plain numbers (kobo).
 * Dates are stored as ISO strings.
 */

// ─── helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function formatNGN(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(kobo / 100);
}

function now(): string {
  return new Date().toISOString();
}

function getList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function setList<T>(key: string, items: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(items));
}

function nextSeq(key: string): number {
  if (typeof window === "undefined") return 1;
  const n = parseInt(localStorage.getItem(key) ?? "0") + 1;
  localStorage.setItem(key, String(n));
  return n;
}

// ─── entity types ─────────────────────────────────────────────────────────────

export interface LocalUser {
  id: string;
  email: string;
  passwordHash: string; // stored as plain for demo — we skip bcrypt in browser
  role: string;
  name: string | null;
  memberId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface LocalMember {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  occupation?: string;
  employer?: string;
  bvn?: string;
  nin?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressLga?: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
  nextOfKinRelationship?: string;
  status: string;
  membershipDate?: string;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalSavingsAccount {
  id: string;
  memberId: string;
  accountNumber: string;
  balanceKobo: number;
  status: string;
  createdAt: string;
}

export interface LocalSavingsTransaction {
  id: string;
  accountId: string;
  transactionType: string;
  direction: string;
  amountKobo: number;
  balanceAfterKobo: number;
  referenceNumber: string;
  transactionDate: string;
  description?: string;
  createdAt: string;
}

export interface LocalLoanProduct {
  id: string;
  name: string;
  description?: string;
  minAmountKobo: number;
  maxAmountKobo: number;
  interestRatePct: number;
  interestType: string;
  maxTenureMonths: number;
  minTenureMonths: number;
  processingFeePct: number;
  guarantorsRequired: number;
  isActive: boolean;
  createdAt: string;
}

export interface LocalLoanApplication {
  id: string;
  applicationNumber: string;
  memberId: string;
  loanProductId: string;
  requestedAmountKobo: number;
  approvedAmountKobo?: number;
  tenureMonths: number;
  purpose: string;
  status: string;
  submittedAt?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalLoan {
  id: string;
  applicationId: string;
  memberId: string;
  principalKobo: number;
  interestKobo: number;
  processingFeeKobo: number;
  totalPayableKobo: number;
  amountPaidKobo: number;
  disbursementDate: string;
  maturityDate: string;
  disbursementMethod?: string;
  status: string;
  createdAt: string;
}

export interface LocalLoanSchedule {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  principalDueKobo: number;
  interestDueKobo: number;
  totalDueKobo: number;
  amountPaidKobo: number;
  isPaid: boolean;
}

export interface LocalRepayment {
  id: string;
  loanId: string;
  amountKobo: number;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber: string;
  createdAt: string;
}

export interface LocalShare {
  id: string;
  memberId: string;
  sharesOwned: number;
  createdAt: string;
}

export interface LocalShareTransaction {
  id: string;
  memberId: string;
  transactionType: string;
  sharesQuantity: number;
  totalAmountKobo: number;
  transactionDate: string;
}

export interface LocalDividend {
  id: string;
  financialYear: number;
  totalProfitKobo: number;
  dividendFundKobo: number;
  dividendRatePct?: number;
  declarationDate: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export interface LocalDividendAllocation {
  id: string;
  dividendId: string;
  memberId: string;
  sharesHeld: number;
  savingsBalanceKobo: number;
  allocationAmountKobo: number;
  status: string;
}

export interface LocalMeeting {
  id: string;
  title: string;
  meetingType: string;
  scheduledDate: string;
  venue: string;
  agenda?: string;
  quorumRequired?: number;
  status: string;
  createdAt: string;
}

export interface LocalMeetingAttendance {
  id: string;
  meetingId: string;
  memberId: string;
  attended: boolean;
  checkedInAt?: string;
}

export interface LocalLevy {
  id: string;
  name: string;
  description?: string;
  amountKobo: number;
  levyType: string;
  appliesTo: string;
  dueDate?: string;
  penaltyRatePct: number;
  isActive: boolean;
  createdAt: string;
}

export interface LocalLevyAssignment {
  id: string;
  levyId: string;
  memberId: string;
  amountDueKobo: number;
  amountPaidKobo: number;
  dueDate?: string;
  status: string;
}

export interface LocalLevyPayment {
  id: string;
  assignmentId: string;
  amountKobo: number;
  paidAt: string;
}

export interface LocalSetting {
  key: string;
  value: string;
}

// ─── keys ────────────────────────────────────────────────────────────────────

const KEYS = {
  users: "coop_users",
  members: "coop_members",
  savingsAccounts: "coop_savings_accounts",
  savingsTransactions: "coop_savings_transactions",
  loanProducts: "coop_loan_products",
  loanApplications: "coop_loan_applications",
  loans: "coop_loans",
  loanSchedule: "coop_loan_schedule",
  repayments: "coop_repayments",
  shares: "coop_shares",
  shareTransactions: "coop_share_transactions",
  dividends: "coop_dividends",
  dividendAllocations: "coop_dividend_allocations",
  meetings: "coop_meetings",
  meetingAttendance: "coop_meeting_attendance",
  levies: "coop_levies",
  levyAssignments: "coop_levy_assignments",
  levyPayments: "coop_levy_payments",
  settings: "coop_settings",
  seeded: "coop_seeded",
};

// ─── seed ─────────────────────────────────────────────────────────────────────

function seed() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(KEYS.seeded)) return;

  // Admin user (password stored plaintext for demo)
  const adminId = uid();
  setList<LocalUser>(KEYS.users, [
    {
      id: adminId,
      email: "admin@cooperative.ng",
      passwordHash: "Admin@1234",
      role: "superadmin",
      name: "Super Admin",
      memberId: null,
      isActive: true,
      createdAt: now(),
    },
  ]);

  // Loan products
  setList<LocalLoanProduct>(KEYS.loanProducts, [
    {
      id: uid(),
      name: "Emergency Loan",
      description: "Quick access loan for emergencies",
      minAmountKobo: 5000_00,
      maxAmountKobo: 100000_00,
      interestRatePct: 10,
      interestType: "flat",
      minTenureMonths: 1,
      maxTenureMonths: 6,
      processingFeePct: 1,
      guarantorsRequired: 1,
      isActive: true,
      createdAt: now(),
    },
    {
      id: uid(),
      name: "Salary Advance",
      description: "Short-term salary advance loan",
      minAmountKobo: 10000_00,
      maxAmountKobo: 500000_00,
      interestRatePct: 8,
      interestType: "flat",
      minTenureMonths: 1,
      maxTenureMonths: 12,
      processingFeePct: 1.5,
      guarantorsRequired: 0,
      isActive: true,
      createdAt: now(),
    },
    {
      id: uid(),
      name: "Business Loan",
      description: "Medium-term loan for business investments",
      minAmountKobo: 50000_00,
      maxAmountKobo: 2000000_00,
      interestRatePct: 15,
      interestType: "reducing_balance",
      minTenureMonths: 6,
      maxTenureMonths: 24,
      processingFeePct: 2,
      guarantorsRequired: 2,
      isActive: true,
      createdAt: now(),
    },
  ]);

  // Settings
  setList<LocalSetting>(KEYS.settings, [
    { key: "cooperative_name", value: "Demo Cooperative Society" },
    { key: "cooperative_rc_number", value: "RC12345" },
    { key: "share_value_kobo", value: "10000" },
    { key: "financial_year_start", value: "01-01" },
    { key: "max_loan_multiplier", value: "3" },
    { key: "membership_fee_kobo", value: "500000" },
  ]);

  localStorage.setItem(KEYS.seeded, "1");
}

// ─── generic CRUD factory ────────────────────────────────────────────────────

function makeStore<T extends { id: string }>(key: string) {
  return {
    findMany(where?: Partial<T>): T[] {
      seed();
      let items = getList<T>(key);
      if (where) {
        items = items.filter((item) =>
          Object.entries(where).every(([k, v]) => (item as Record<string, unknown>)[k] === v)
        );
      }
      return items;
    },

    findUnique(id: string): T | null {
      seed();
      return getList<T>(key).find((i) => i.id === id) ?? null;
    },

    findFirst(where: Partial<T>): T | null {
      seed();
      const items = getList<T>(key);
      return (
        items.find((item) =>
          Object.entries(where).every(([k, v]) => (item as Record<string, unknown>)[k] === v)
        ) ?? null
      );
    },

    create(data: Omit<T, "id"> & { id?: string }): T {
      seed();
      const item = { ...data, id: (data as { id?: string }).id ?? uid() } as T;
      const items = getList<T>(key);
      items.push(item);
      setList(key, items);
      return item;
    },

    update(id: string, data: Partial<T>): T | null {
      seed();
      const items = getList<T>(key);
      const idx = items.findIndex((i) => i.id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...data };
      setList(key, items);
      return items[idx];
    },

    delete(id: string): void {
      seed();
      const items = getList<T>(key).filter((i) => i.id !== id);
      setList(key, items);
    },

    count(where?: Partial<T>): number {
      return this.findMany(where).length;
    },

    all(): T[] {
      seed();
      return getList<T>(key);
    },
  };
}

// ─── db object ───────────────────────────────────────────────────────────────

export const localDb = {
  init() {
    seed();
  },

  users: makeStore<LocalUser>(KEYS.users),
  members: {
    ...makeStore<LocalMember>(KEYS.members),

    findManyFiltered(opts: {
      search?: string;
      status?: string;
      page?: number;
      limit?: number;
    }): { items: LocalMember[]; total: number } {
      seed();
      let items = getList<LocalMember>(KEYS.members).filter((m) => !m.deletedAt);
      if (opts.status) items = items.filter((m) => m.status === opts.status);
      if (opts.search) {
        const q = opts.search.toLowerCase();
        items = items.filter(
          (m) =>
            m.firstName.toLowerCase().includes(q) ||
            m.lastName.toLowerCase().includes(q) ||
            m.memberNumber.toLowerCase().includes(q) ||
            m.phone.includes(q) ||
            (m.email ?? "").toLowerCase().includes(q)
        );
      }
      items = items.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const total = items.length;
      const page = opts.page ?? 1;
      const limit = opts.limit ?? 20;
      return { items: items.slice((page - 1) * limit, page * limit), total };
    },

    createMember(data: Omit<LocalMember, "id" | "memberNumber" | "createdAt" | "updatedAt" | "status">): LocalMember {
      seed();
      const seq = nextSeq("coop_member_seq");
      const year = new Date().getFullYear();
      const member: LocalMember = {
        ...data,
        id: uid(),
        memberNumber: `COOP-${year}-${String(seq).padStart(4, "0")}`,
        status: "pending",
        createdAt: now(),
        updatedAt: now(),
      };
      const items = getList<LocalMember>(KEYS.members);
      items.push(member);
      setList(KEYS.members, items);

      // Auto-create savings account
      const accountSeq = nextSeq("coop_account_seq");
      const account: LocalSavingsAccount = {
        id: uid(),
        memberId: member.id,
        accountNumber: `SAV-${String(accountSeq).padStart(8, "0")}`,
        balanceKobo: 0,
        status: "active",
        createdAt: now(),
      };
      const accounts = getList<LocalSavingsAccount>(KEYS.savingsAccounts);
      accounts.push(account);
      setList(KEYS.savingsAccounts, accounts);

      return member;
    },
  },

  savingsAccounts: makeStore<LocalSavingsAccount>(KEYS.savingsAccounts),
  savingsTransactions: {
    ...makeStore<LocalSavingsTransaction>(KEYS.savingsTransactions),

    recordTransaction(data: {
      accountId: string;
      type: string;
      amountKobo: number;
      paymentMethod: string;
      transactionDate: string;
      description?: string;
    }): LocalSavingsTransaction {
      seed();
      const accounts = getList<LocalSavingsAccount>(KEYS.savingsAccounts);
      const accIdx = accounts.findIndex((a) => a.id === data.accountId);
      if (accIdx === -1) throw new Error("Account not found");

      const direction = data.type === "deposit" ? "credit" : "debit";
      if (direction === "debit" && accounts[accIdx].balanceKobo < data.amountKobo) {
        throw new Error("Insufficient balance");
      }

      const newBalance =
        direction === "credit"
          ? accounts[accIdx].balanceKobo + data.amountKobo
          : accounts[accIdx].balanceKobo - data.amountKobo;

      accounts[accIdx].balanceKobo = newBalance;
      setList(KEYS.savingsAccounts, accounts);

      const seq = nextSeq("coop_txn_seq");
      const txn: LocalSavingsTransaction = {
        id: uid(),
        accountId: data.accountId,
        transactionType: data.type,
        direction,
        amountKobo: data.amountKobo,
        balanceAfterKobo: newBalance,
        referenceNumber: `TXN-${Date.now().toString(36).toUpperCase()}-${String(seq).padStart(4, "0")}`,
        transactionDate: data.transactionDate,
        description: data.description,
        createdAt: now(),
      };

      const txns = getList<LocalSavingsTransaction>(KEYS.savingsTransactions);
      txns.push(txn);
      setList(KEYS.savingsTransactions, txns);
      return txn;
    },
  },

  loanProducts: makeStore<LocalLoanProduct>(KEYS.loanProducts),
  loanApplications: {
    ...makeStore<LocalLoanApplication>(KEYS.loanApplications),

    findManyFiltered(opts: {
      status?: string;
      memberId?: string;
      page?: number;
      limit?: number;
    }): { items: LocalLoanApplication[]; total: number } {
      seed();
      let items = getList<LocalLoanApplication>(KEYS.loanApplications);
      if (opts.status) items = items.filter((a) => a.status === opts.status);
      if (opts.memberId) items = items.filter((a) => a.memberId === opts.memberId);
      items = items.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const total = items.length;
      const page = opts.page ?? 1;
      const limit = opts.limit ?? 20;
      return { items: items.slice((page - 1) * limit, page * limit), total };
    },

    createApplication(data: {
      memberId: string;
      loanProductId: string;
      requestedAmountKobo: number;
      tenureMonths: number;
      purpose: string;
    }): LocalLoanApplication {
      seed();
      const seq = nextSeq("coop_app_seq");
      const year = new Date().getFullYear();
      const app: LocalLoanApplication = {
        id: uid(),
        applicationNumber: `LA-${year}-${String(seq).padStart(5, "0")}`,
        ...data,
        status: "submitted",
        submittedAt: now(),
        createdAt: now(),
        updatedAt: now(),
      };
      const items = getList<LocalLoanApplication>(KEYS.loanApplications);
      items.push(app);
      setList(KEYS.loanApplications, items);
      return app;
    },
  },

  loans: makeStore<LocalLoan>(KEYS.loans),
  loanSchedule: makeStore<LocalLoanSchedule>(KEYS.loanSchedule),
  repayments: makeStore<LocalRepayment>(KEYS.repayments),

  shares: makeStore<LocalShare>(KEYS.shares),
  shareTransactions: makeStore<LocalShareTransaction>(KEYS.shareTransactions),

  dividends: makeStore<LocalDividend>(KEYS.dividends),
  dividendAllocations: makeStore<LocalDividendAllocation>(KEYS.dividendAllocations),

  meetings: {
    ...makeStore<LocalMeeting>(KEYS.meetings),

    createMeeting(data: Omit<LocalMeeting, "id" | "status" | "createdAt">): LocalMeeting {
      const meeting: LocalMeeting = {
        ...data,
        id: uid(),
        status: "scheduled",
        createdAt: now(),
      };
      const items = getList<LocalMeeting>(KEYS.meetings);
      items.push(meeting);
      setList(KEYS.meetings, items);
      return meeting;
    },
  },

  meetingAttendance: makeStore<LocalMeetingAttendance>(KEYS.meetingAttendance),

  levies: {
    ...makeStore<LocalLevy>(KEYS.levies),

    createLevy(data: Omit<LocalLevy, "id" | "isActive" | "createdAt">): LocalLevy {
      const levy: LocalLevy = {
        ...data,
        id: uid(),
        isActive: true,
        createdAt: now(),
      };
      const items = getList<LocalLevy>(KEYS.levies);
      items.push(levy);
      setList(KEYS.levies, items);
      return levy;
    },
  },

  levyAssignments: makeStore<LocalLevyAssignment>(KEYS.levyAssignments),
  levyPayments: makeStore<LocalLevyPayment>(KEYS.levyPayments),

  settings: {
    getAll(): Record<string, string> {
      seed();
      const items = getList<LocalSetting>(KEYS.settings);
      return Object.fromEntries(items.map((s) => [s.key, s.value]));
    },

    get(key: string): string | null {
      seed();
      const item = getList<LocalSetting>(KEYS.settings).find((s) => s.key === key);
      return item?.value ?? null;
    },

    set(key: string, value: string): void {
      seed();
      const items = getList<LocalSetting>(KEYS.settings);
      const idx = items.findIndex((s) => s.key === key);
      if (idx === -1) {
        items.push({ key, value });
      } else {
        items[idx].value = value;
      }
      setList(KEYS.settings, items);
    },

    setMany(data: Record<string, string>): void {
      for (const [k, v] of Object.entries(data)) {
        this.set(k, v);
      }
    },
  },
};
