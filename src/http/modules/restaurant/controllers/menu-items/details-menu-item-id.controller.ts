import {
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  UnauthorizedException,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { PrismaService } from '@/prisma/prisma.service'
import { TokenPayloadRestaurantSchema } from '../../auth/jwt.strategy'
import { ZodValidationPipe } from '@/http/shared/pipes/zod-valitation-pipe'
import { z } from 'zod'
import { CurrentRestaurant } from '../../../current-restaurant.decorator'

const getMenuItemIdRestaurantSchema = z.string().uuid()

type GetMenuItemIdRestaurantSchema = z.infer<
  typeof getMenuItemIdRestaurantSchema
>

const queryValidationPipe = new ZodValidationPipe(getMenuItemIdRestaurantSchema)

export class GetMenuItemIdRestaurantDto {
  @ApiProperty({
    description: 'ID da Produto',
    example: 'c9ce5fb1-9785-4fae-9011-14403989f1d0',
  })
  categoryId!: string
}

@ApiTags('Item Menu')
@ApiBearerAuth('access-token')
@Controller('/restaurant/menu-item')
export class GetDetailsProductIdRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Get(':menuItemId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Buscar dados do produto' })
  @ApiResponse({
    status: 200,
    description: 'Retorna todos os dados disponiveis do produto',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Param('menuItemId', queryValidationPipe)
    menuItemId: GetMenuItemIdRestaurantSchema,
  ) {
    const member = await this.prisma.member.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        isActive: true,
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

    if (!member.isActive) {
      throw new UnauthorizedException('Unauthorized - no active member')
    }

    if (!['Admin', 'Gerente', 'Suporte Técnico'].includes(member.role.name)) {
      throw new UnauthorizedException('You are not allowed to do this')
    }

    const getMenuItem = await this.prisma.menuItem.findUnique({
      where: {
        id: menuItemId,
        restaurantId: payload.restaurantId,
      },
      select: {
        id: true,
        description: true,
        categoryId: true,
        name: true,
        price: true,
        imageUrl: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        options: {
          select: {
            option: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    })

    if (!getMenuItem) {
      throw new NotFoundException('Produto não encontrado')
    }

    return getMenuItem
  }
}
