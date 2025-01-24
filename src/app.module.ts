import { Module } from '@nestjs/common'
import { PrismaService } from './prisma/prisma.service'
import { CreateRestaurantController } from './modules/restaurant/controllers/create-restaurant.controller'
import { ConfigModule } from '@nestjs/config'
import { envSchema } from './env'

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (env) => envSchema.parse(env),
      isGlobal: true,
    }),
  ],
  controllers: [CreateRestaurantController],
  providers: [PrismaService],
})
export class AppModule {}
