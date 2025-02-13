import {
  Controller,
  Delete,
  HttpCode,
  NotFoundException,
  Param,
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

const getCategoryIdRestaurantSchema = z.string().uuid()

type GetCategoryIdRestaurantSchema = z.infer<
  typeof getCategoryIdRestaurantSchema
>

const queryValidationPipe = new ZodValidationPipe(getCategoryIdRestaurantSchema)

export class DeleteCategoryRestaurantDto {
  @ApiProperty({
    description: 'ID da Categoria',
    example: 'c9ce5fb1-9785-4fae-9011-14403989f1d0',
  })
  categoryId!: string
}

@ApiTags('Categorias')
@ApiBearerAuth('access-token')
@Controller('/restaurant/categories')
export class DeleteCategoryRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Delete(':categoryId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Deletar uma Categoria' })
  @ApiBody({
    description: 'Parâmetros necessários para deletar uma Categoria',
    type: DeleteCategoryRestaurantDto,
  })
  @ApiResponse({
    status: 204,
    description: 'Categoria deletada!',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Param('categoryId', queryValidationPipe)
    categoryId: GetCategoryIdRestaurantSchema,
  ) {
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
    })

    if (!categoryExists) {
      throw new NotFoundException('Category not found')
    }

    await this.prisma.$transaction([
      this.prisma.category.delete({
        where: { id: categoryId, restaurantId: payload.restaurantId },
      }),
      this.prisma.menuItem.deleteMany({
        where: { categoryId },
      }),
    ])

    await this.prisma.log.create({
      data: {
        event: 'Deletou uma categoria',
        description:
          'Deletou uma categoria e todas os itens que estão atrelados a ele',
        logType: 'DELETE',
        affectedEntity: 'CATEGORY',
        affectedId: categoryExists.id,
        memberId: payload.sub,
        restaurantId: payload.restaurantId,
      },
    })
  }
}
