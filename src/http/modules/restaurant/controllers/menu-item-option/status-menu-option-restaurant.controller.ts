import {
  Body,
  Controller,
  HttpCode,
  NotFoundException,
  Param,
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

const statusComplementRestaurantSchema = z.object({
  isActive: z.boolean(),
})

const getComplementIdRestaurantSchema = z.string().uuid()

type GetComplementIdRestaurantSchema = z.infer<
  typeof getComplementIdRestaurantSchema
>

const queryValidationPipe = new ZodValidationPipe(
  getComplementIdRestaurantSchema,
)

export class StatusComplementRestaurantDto {
  @ApiProperty({
    description: 'ID do Complemento',
    example: 'c9ce5fb1-9785-4fae-9011-14403989f1d0',
  })
  complementId!: string

  @ApiProperty({
    description: 'Ativar ou Desativar Complemento',
    example: false,
  })
  isActive!: boolean
}

type TypeStatusComplementRestaurantSchema = z.infer<
  typeof statusComplementRestaurantSchema
>

@ApiTags('Complementos')
@ApiBearerAuth('access-token')
@Controller('/restaurant/menu-item-option/:complementId/status')
export class StatusComplementRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Patch()
  @HttpCode(204)
  @ApiOperation({ summary: 'Atualizar Status Complemento' })
  @ApiBody({
    description: 'Parâmetros necessários para atualizar Status do Complemento',
    type: StatusComplementRestaurantDto,
  })
  @ApiResponse({
    status: 204,
    description: 'Status do complemento atualizado!',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  @ApiResponse({ status: 404, description: 'Complemento não encontrado' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Param('complementId', queryValidationPipe)
    complementId: GetComplementIdRestaurantSchema,
    @Body(new ZodValidationPipe(statusComplementRestaurantSchema))
    body: TypeStatusComplementRestaurantSchema,
  ) {
    const { isActive } = body

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
      include: {
        menuItems: true,
      },
    })

    if (!complementExists) {
      throw new NotFoundException('Complement not found')
    }

    await this.prisma.menuItemOption.update({
      data: { isActive },
      where: { id: complementId, restaurantId: payload.restaurantId },
    })

    await this.prisma.log.create({
      data: {
        event: 'Atualizou o status do complemento',
        description: `Complemento atualizado para ${
          isActive ? 'ativos' : 'inativos'
        }`,
        logType: 'UPDATE',
        affectedEntity: 'MENU_ITEM_OPTIONS',
        affectedId: complementId,
        memberId: payload.sub,
        restaurantId: payload.restaurantId,
      },
    })
  }
}
