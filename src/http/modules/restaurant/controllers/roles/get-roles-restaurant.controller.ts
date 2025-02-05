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

@ApiTags('Permissões')
@ApiBearerAuth('access-token')
@Controller('/restaurant/role')
export class GetRolesRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Listar todas as Roles' })
  @ApiResponse({
    status: 200,
    description: 'Retorna todas as roles disponiveis',
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

    const getRoles = await this.prisma.role.findMany({
      select: {
        id: true,
        name: true,
      },
    })

    if (
      member.role.name === 'Admin' ||
      member.role.name === 'Suporte Técnico'
    ) {
      return getRoles
    }

    if (member.role.name === 'Gerente') {
      return getRoles.filter((role) => role.name !== 'Admin')
    }

    return getRoles
  }
}
