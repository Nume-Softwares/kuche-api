import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { TokenPayloadRestaurantSchema } from './restaurant/jwt.strategy'

export const CurrentRestaurant = createParamDecorator(
  (_: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest()

    return request.user as TokenPayloadRestaurantSchema
  },
)
