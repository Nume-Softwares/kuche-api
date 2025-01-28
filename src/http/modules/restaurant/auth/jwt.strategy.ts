import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { Env } from '@/env'
import { z } from 'zod'

const tokenPayloadRestaurantSchema = z.object({
  sub: z.string().uuid(),
  restaurantId: z.string().uuid(),
})

export type TokenPayloadRestaurantSchema = z.infer<
  typeof tokenPayloadRestaurantSchema
>

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService<Env, true>) {
    const publicKey = config.get('JWT_PUBLIC_KEY_RESTAURANT', { infer: true })

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: Buffer.from(publicKey, 'base64'),
      algorithms: ['RS256'],
    })
  }

  async validate(payload: TokenPayloadRestaurantSchema) {
    return tokenPayloadRestaurantSchema.parse(payload)
  }
}
