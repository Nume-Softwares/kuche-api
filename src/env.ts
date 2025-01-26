import { z } from 'zod'

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  PORT: z.coerce.number().optional().default(3333),
  JWT_SECRET_RESTAURANT: z.string(),
  JWT_PRIVATE_KEY_RESTAURANT: z.string(),
  JWT_PUBLIC_KEY_RESTAURANT: z.string(),
})

export type Env = z.infer<typeof envSchema>
