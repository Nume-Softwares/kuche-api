import {
  Controller,
  Get,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { PrismaService } from '@/prisma/prisma.service'
import { CurrentRestaurant } from '@/http/modules/current-restaurant.decorator'
import { TokenPayloadRestaurantSchema } from '../../auth/jwt.strategy'

@ApiTags('Categorias')
@ApiBearerAuth('access-token')
@Controller('/restaurant/categories-active')
export class GetAciveCategoriesRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Listar todas as Categorias' })
  @ApiResponse({
    status: 200,
    description: 'Retorna todas as categorias disponiveis',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  async handle(@CurrentRestaurant() payload: TokenPayloadRestaurantSchema) {
    const member = await this.prisma.member.findUnique({
      where: {
        id: payload.sub,
        restaurantId: payload.restaurantId,
        isActive: true,
      },
      select: {
        role: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!member) {
      throw new UnauthorizedException('Unauthorized')
    }

    const getActivesCategories = await this.prisma.category.findMany({
      where: {
        isActive: true,
        restaurantId: payload.restaurantId,
      },
      select: {
        id: true,
        name: true,
      },
    })

    return getActivesCategories
  }
}
