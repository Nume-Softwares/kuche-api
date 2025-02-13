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

const getComplementRestaurantSchema = z.string().uuid()

type GetComplementRestaurantSchema = z.infer<
  typeof getComplementRestaurantSchema
>

const queryValidationPipe = new ZodValidationPipe(getComplementRestaurantSchema)

export class DeleteComplementRestaurantDto {
  @ApiProperty({
    description: 'ID do Complemento',
    example: 'c9ce5fb1-9785-4fae-9011-14403989f1d0',
  })
  complementId!: string
}

@ApiTags('Categorias')
@ApiBearerAuth('access-token')
@Controller('/restaurant/menu-item-option')
export class DeleteComplementRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Delete(':complementId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Deletar uma Categoria' })
  @ApiBody({
    description: 'Parâmetros necessários para deletar uma Categoria',
    type: DeleteComplementRestaurantDto,
  })
  @ApiResponse({
    status: 204,
    description: 'Categoria deletada!',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Param('complementId', queryValidationPipe)
    complementId: GetComplementRestaurantSchema,
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

    const complementExists = await this.prisma.menuItemOption.findUnique({
      where: {
        id: complementId,
        restaurantId: payload.restaurantId,
      },
    })

    if (!complementExists) {
      throw new NotFoundException('Complement not found')
    }

    await this.prisma.$transaction([
      this.prisma.menuItemOption.delete({
        where: { id: complementId, restaurantId: payload.restaurantId },
      }),
      this.prisma.menuItemOptionRelation.deleteMany({
        where: {
          optionId: complementId,
        },
      }),
    ])

    await this.prisma.log.create({
      data: {
        event: 'Deletou um complemento',
        description: 'Deletou um complemento',
        logType: 'DELETE',
        affectedEntity: 'MENU_ITEM_OPTIONS',
        affectedId: complementExists.id,
        memberId: payload.sub,
        restaurantId: payload.restaurantId,
      },
    })
  }
}
