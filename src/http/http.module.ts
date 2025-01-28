import { Module } from '@nestjs/common'
import { RestaurantModule } from './modules/restaurant/restaurant.module'

@Module({
  imports: [RestaurantModule],
})
export class HttpModule {}
