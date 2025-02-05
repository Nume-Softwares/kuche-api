import {
  Body,
  Controller,
  HttpCode,
  NotFoundException,
  Patch,
  UnauthorizedException,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { PrismaService } from '@/prisma/prisma.service'
import { ZodValidationPipe } from '@/http/shared/pipes/zod-valitation-pipe'
import { z } from 'zod'
import { CurrentRestaurant } from '@/http/modules/current-restaurant.decorator'
import { TokenPayloadRestaurantSchema } from '../../auth/jwt.strategy'

const statusCategoryRestaurantSchema = z.object({
  categoryId: z.string(),
  isActive: z.boolean(),
})

export class StatusCategoryRestaurantDto {
  @ApiProperty({
    description: 'ID da Categoria',
    example: 'c9ce5fb1-9785-4fae-9011-14403989f1d0',
  })
  categoryId!: string

  @ApiProperty({
    description: 'Ativar ou Desativar Categoria',
    example: false,
  })
  isActive!: boolean
}

type TypeStatusCategoryRestaurantSchema = z.infer<
  typeof statusCategoryRestaurantSchema
>

@ApiTags('Categorias')
@ApiBearerAuth('access-token')
@Controller('/restaurant/categories-status')
export class StatusCategoryRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Patch()
  @HttpCode(204)
  @ApiOperation({ summary: 'Atualizar Status Categoria' })
  @ApiBody({
    description: 'Parâmetros necessários para atualizar Status Categoria',
    type: StatusCategoryRestaurantDto,
  })
  @ApiResponse({
    status: 204,
    description: 'Status da categoria atualizado!',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Body(new ZodValidationPipe(statusCategoryRestaurantSchema))
    body: TypeStatusCategoryRestaurantSchema,
  ) {
    const { categoryId, isActive } = body

    const getMember = await this.prisma.member.findUnique({
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

    if (!getMember) {
      throw new UnauthorizedException('Unauthorized')
    }

    if (!getMember.isActive) {
      throw new UnauthorizedException('Unauthorized - no active member')
    }

    if (
      !['Admin', 'Gerente', 'Suporte Técnico'].includes(getMember.role.name)
    ) {
      throw new UnauthorizedException('You are not allowed to do this')
    }

    const categoryExists = await this.prisma.category.findUnique({
      where: {
        id: categoryId,
        restaurantId: payload.restaurantId,
      },
      include: {
        menuItems: true,
      },
    })

    if (!categoryExists) {
      throw new NotFoundException('Category not found')
    }

    await this.prisma.$transaction([
      this.prisma.category.update({
        data: { isActive },
        where: { id: categoryId, restaurantId: payload.restaurantId },
      }),
      this.prisma.menuItem.updateMany({
        data: { isActive },
        where: { categoryId },
      }),
    ])

    await this.prisma.log.create({
      data: {
        event: 'Atualizou o status da categoria',
        description: `Categoria e menu items atualizados para ${
          isActive ? 'ativos' : 'inativos'
        }`,
        logType: 'UPDATE',
        affectedEntity: 'CATEGORY',
        affectedId: categoryId,
        memberId: payload.sub,
        restaurantId: payload.restaurantId,
      },
    })
  }
}
