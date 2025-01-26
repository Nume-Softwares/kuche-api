import { Module } from '@nestjs/common'
import { PrismaService } from './prisma/prisma.service'
import { CreateRestaurantController } from './modules/restaurant/controllers/create-restaurant.controller'
import { ConfigModule } from '@nestjs/config'
import { envSchema } from './env'
import { RestaurantModule } from './modules/restaurant/restaurant.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (env) => envSchema.parse(env),
      isGlobal: true,
    }),
    RestaurantModule,
  ],
  controllers: [CreateRestaurantController],
  providers: [PrismaService],
})
export class AppModule {}
