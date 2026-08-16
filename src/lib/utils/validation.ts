import { z } from 'zod'

export const registerSchema = z.object({
  username: z.string().min(3, 'Логин минимум 3 символа').max(20, 'Логин максимум 20 символов').regex(/^[a-zA-Z0-9_]+$/, 'Только буквы, цифры и подчёркивание'),
  password: z.string().min(8, 'Пароль минимум 8 символов'),
  name: z.string().min(2, 'Имя минимум 2 символа').max(50).optional(),
  dateOfBirth: z.iso.date({ message: 'Дата в формате ГГГГ-ММ-ДД' }).optional(),
})

export const signinSchema = z.object({
  username: z.string().min(3, 'Логин минимум 3 символа').max(20, 'Логин максимум 20 символов').regex(/^[a-zA-Z0-9_]+$/, 'Только буквы, цифры и подчёркивание'),
  password: z.string().min(1, 'Введите пароль'),
})

export const linkRequestSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
})

export const linkAnswerSchema = z.object({
  accept: z.boolean(),
})

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  dateOfBirth: z.iso.date({ message: 'Дата в формате ГГГГ-ММ-ДД' }).optional(),
  avatarUrl: z.string().url().optional(),
  cityId: z.string().cuid().nullable().optional(),
})

export const inviteSchema = z.object({
  email: z.string().email('Неверный email партнёра').optional(),
})

export const assessmentAnswerSchema = z.object({
  questionId: z.string(),
  answer: z.union([
    z.number(),
    z.string(),
    z.array(z.string()),
  ]),
})

export const assessmentSubmitSchema = z.object({
  assessmentId: z.string(),
  answers: z.array(assessmentAnswerSchema),
})

export const pulseCheckinSchema = z.object({
  closeness: z.number().int().min(1).max(10),
  conflictResolution: z.number().int().min(1).max(10),
  missing: z.string().max(500).optional(),
})

export const challengeCompleteSchema = z.object({
  challengeId: z.string(),
})

export const aiChatSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
})

export const settingsSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  weeklyPulseReminder: z.boolean().optional(),
  challengeReminder: z.boolean().optional(),
})

export const consentSchema = z.object({
  type: z.enum(['personal_data', 'sensitive_data', 'marketing']),
  accepted: z.boolean(),
})

export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) return { success: true, data: result.data }
  return { success: false, errors: result.error }
}