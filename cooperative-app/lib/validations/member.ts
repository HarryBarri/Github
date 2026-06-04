import { z } from "zod";

export const createMemberSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(20),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  occupation: z.string().max(200).optional(),
  employer: z.string().max(200).optional(),
  bvn: z.string().length(11).optional(),
  nin: z.string().length(11).optional(),
  addressStreet: z.string().optional(),
  addressCity: z.string().max(100).optional(),
  addressState: z.string().max(50).optional(),
  addressLga: z.string().max(100).optional(),
  nextOfKinName: z.string().max(200).optional(),
  nextOfKinPhone: z.string().max(20).optional(),
  nextOfKinRelationship: z.string().max(50).optional(),
});

export const updateMemberSchema = createMemberSchema.partial();

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
