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

const getComplementIdRestaurantSchema = z.string().uuid()

type GetComplementIdRestaurantSchema = z.infer<
  typeof getComplementIdRestaurantSchema
>

const queryValidationPipe = new ZodValidationPipe(
  getComplementIdRestaurantSchema,
)

export class GetComplementIdRestaurantDto {
  @ApiProperty({
    description: 'ID do complemento',
    example: 'c9ce5fb1-9785-4fae-9011-14403989f1d0',
  })
  complementId!: string
}

@ApiTags('Complementos')
@ApiBearerAuth('access-token')
@Controller('/restaurant/menu-item-option')
export class GetComplementIdRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Get(':complementId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Buscar dados do complemento' })
  @ApiResponse({
    status: 200,
    description: 'Retorna todos os dados disponiveis do complemento',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Param('complementId', queryValidationPipe)
    complementId: GetComplementIdRestaurantSchema,
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

    const getComplement = await this.prisma.menuItemOption.findUnique({
      where: {
        id: complementId,
        restaurantId: payload.restaurantId,
      },
      select: {
        id: true,
        name: true,
        price: true,
        isActive: true,
      },
    })

    if (!getComplement) {
      throw new NotFoundException('Complement not found')
    }

    return {
      ...getComplement,
      price: parseFloat(parseFloat(getComplement.price.toString()).toFixed(2)),
    }
  }
}
