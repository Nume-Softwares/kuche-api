import { z } from 'zod'

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  PORT: z.coerce.number().optional().default(3333),
  PORT_DEV: z.coerce.number().optional().default(3000),
  JWT_SECRET_RESTAURANT: z.string(),
  JWT_PRIVATE_KEY_RESTAURANT: z.string(),
  JWT_PUBLIC_KEY_RESTAURANT: z.string(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>
