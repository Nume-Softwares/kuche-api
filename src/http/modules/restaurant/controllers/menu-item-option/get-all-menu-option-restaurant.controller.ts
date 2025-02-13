import { Controller, Get, HttpCode } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { PrismaService } from '@/prisma/prisma.service'
import { CurrentRestaurant } from '@/http/modules/current-restaurant.decorator'
import { TokenPayloadRestaurantSchema } from '../../auth/jwt.strategy'

@ApiTags('Complementos')
@ApiBearerAuth('access-token')
@Controller('/restaurant/all-menu-item-option')
export class GetAllComplementsRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Lista todas os complementos' })
  @ApiResponse({
    status: 200,
    description: 'Retorna todos os complementos',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  async handle(@CurrentRestaurant() payload: TokenPayloadRestaurantSchema) {
    const getComplements = await this.prisma.menuItemOption.findMany({
      where: {
        restaurantId: payload.restaurantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        price: true,
      },
    })

    const formattedComplements = getComplements.map((complement) => ({
      ...complement,
      price: parseFloat(parseFloat(complement.price.toString()).toFixed(2)),
    }))

    return formattedComplements
  }
}
