import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { Env } from '@/env'
import { AuthenticateRestaurantController } from './controllers/authenticate-restaurant.controller'
import { PrismaService } from '@/prisma/prisma.service'
import { JwtStrategy } from './jwt.strategy'
import { CreateRoleRestaurantController } from './controllers/create-role-restaurant.controller'
import { GetMembersRestaurantController } from './controllers/get-members-restaurant.controller'

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      global: true,
      useFactory(config: ConfigService<Env, true>) {
        const privateKey = config.get('JWT_PRIVATE_KEY_RESTAURANT', {
          infer: true,
        })
        const publicKey = config.get('JWT_PUBLIC_KEY_RESTAURANT', {
          infer: true,
        })

        return {
          signOptions: { algorithm: 'RS256' },
          privateKey: Buffer.from(privateKey, 'base64'),
          publicKey: Buffer.from(publicKey, 'base64'),
        }
      },
    }),
  ],
  controllers: [
    AuthenticateRestaurantController,
    CreateRoleRestaurantController,
    GetMembersRestaurantController,
  ],
  providers: [PrismaService, JwtStrategy],
})
export class RestaurantModule {}
