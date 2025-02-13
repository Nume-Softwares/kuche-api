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

const getCategoryIdRestaurantSchema = z.string().uuid()

type GetCategoryIdRestaurantSchema = z.infer<
  typeof getCategoryIdRestaurantSchema
>

const queryValidationPipe = new ZodValidationPipe(getCategoryIdRestaurantSchema)

export class GetCategoryIdrRestaurantDto {
  @ApiProperty({
    description: 'ID da Categoria',
    example: 'c9ce5fb1-9785-4fae-9011-14403989f1d0',
  })
  categoryId!: string
}

@ApiTags('Membro')
@ApiBearerAuth('access-token')
@Controller('/restaurant/categories')
export class GetCategoryIdRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Get(':categoryId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Buscar dados da categoria' })
  @ApiResponse({
    status: 200,
    description: 'Retorna todos os dados disponiveis da categoria',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Param('categoryId', queryValidationPipe)
    categoryId: GetCategoryIdRestaurantSchema,
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

    const getCategory = await this.prisma.category.findUnique({
      where: {
        id: categoryId,
        restaurantId: payload.restaurantId,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    })

    if (!getCategory) {
      throw new NotFoundException('Category not found')
    }

    return getCategory
  }
}
