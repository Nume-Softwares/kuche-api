import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { Env } from '@/env'
import { AuthenticateRestaurantController } from './controllers/authenticate-restaurant.controller'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateRoleRestaurantController } from './controllers/create-role-restaurant.controller'
import { GetMembersRestaurantController } from './controllers/get-members-restaurant.controller'
import { CreateRestaurantController } from './controllers/create-restaurant.controller'
import { APP_GUARD } from '@nestjs/core'
import { JwtAuthGuard } from './auth/jwt-auth.guard'
import { AuthRestaurantModule } from './auth/authRestaurant.module'
import { GetRolesRestaurantController } from './controllers/get-roles-restaurant.controller'
import { CreateMemberRestaurantController } from './controllers/create-member-restaurant.controller'

@Module({
  imports: [
    AuthRestaurantModule,
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
    CreateRestaurantController,
    GetRolesRestaurantController,
    CreateMemberRestaurantController,
  ],
  providers: [
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class RestaurantModule {}
