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

const updateCategoryRestaurantSchema = z.object({
  categoryId: z.string(),
  name: z.string(),
  isActive: z.boolean(),
})

export class UpdateCategoryRestaurantDto {
  @ApiProperty({
    description: 'ID da Categoria',
    example: 'c9ce5fb1-9785-4fae-9011-14403989f1d0',
  })
  categoryId!: string

  @ApiProperty({
    description: 'Nome da Categoria',
    example: 'Pizzas',
  })
  name!: string

  @ApiProperty({
    description: 'Ativar ou Desativar Categoria',
    example: false,
  })
  isActive!: boolean
}

type TypeUpdateCategoryRestaurantSchema = z.infer<
  typeof updateCategoryRestaurantSchema
>

@ApiTags('Categorias')
@ApiBearerAuth('access-token')
@Controller('/restaurant/categories')
export class UpdateCategoryRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Patch()
  @HttpCode(204)
  @ApiOperation({ summary: 'Atualizar a Categoria' })
  @ApiBody({
    description: 'Parâmetros necessários para atualizar a Categoria',
    type: UpdateCategoryRestaurantDto,
  })
  @ApiResponse({
    status: 204,
    description: 'Categoria atualizada!',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Body(new ZodValidationPipe(updateCategoryRestaurantSchema))
    body: TypeUpdateCategoryRestaurantSchema,
  ) {
    const { categoryId, isActive, name } = body

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

    const updatedStatusCategory = await this.prisma.category.update({
      data: {
        name: name,
        isActive: isActive,
      },
      where: {
        id: categoryId,
        restaurantId: payload.restaurantId,
      },
      select: {
        id: true,
      },
    })

    await this.prisma.log.create({
      data: {
        event: 'Atualizou uma categoria',
        description: '',
        logType: 'UPDATE',
        affectedEntity: 'CATEGORY',
        affectedId: updatedStatusCategory.id,
        memberId: payload.sub,
        restaurantId: payload.restaurantId,
      },
    })
  }
}
