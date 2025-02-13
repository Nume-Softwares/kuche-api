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

const updateComplementRestaurantSchema = z.object({
  name: z.string(),
  price: z.number(),
})

const getComplementIdRestaurantSchema = z.string()

type GetComplementIdRestaurantSchema = z.infer<
  typeof getComplementIdRestaurantSchema
>

const queryValidationPipe = new ZodValidationPipe(
  getComplementIdRestaurantSchema,
)

export class UpdateComplementRestaurantDto {
  @ApiProperty({
    description: 'ID do Complemento',
    example: 'c9ce5fb1-9785-4fae-9011-14403989f1d0',
  })
  complementId!: string

  @ApiProperty({
    description: 'Nome do Complemento',
    example: 'Queijo extra',
  })
  name!: string
}

type TypeUpdateComplementRestaurantSchema = z.infer<
  typeof updateComplementRestaurantSchema
>

@ApiTags('Complementos')
@ApiBearerAuth('access-token')
@Controller('/restaurant/menu-item-option')
export class UpdateComplementRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Patch(':complementId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Atualizar o complemento' })
  @ApiBody({
    description: 'Parâmetros necessários para atualizar o Complemento',
    type: UpdateComplementRestaurantDto,
  })
  @ApiResponse({
    status: 204,
    description: 'Complemento atualizado!',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  @ApiResponse({ status: 404, description: 'Complemento não encontrado' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Param('complementId', queryValidationPipe)
    complementId: GetComplementIdRestaurantSchema,
    @Body(new ZodValidationPipe(updateComplementRestaurantSchema))
    body: TypeUpdateComplementRestaurantSchema,
  ) {
    const { name, price } = body

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

    const updatedStatusComplement = await this.prisma.menuItemOption.update({
      data: {
        name,
        price,
      },
      where: {
        id: complementId,
        restaurantId: payload.restaurantId,
      },
      select: {
        id: true,
      },
    })

    await this.prisma.log.create({
      data: {
        event: 'Atualizou um complemento',
        description: '',
        logType: 'UPDATE',
        affectedEntity: 'MENU_ITEM_OPTIONS',
        affectedId: updatedStatusComplement.id,
        memberId: payload.sub,
        restaurantId: payload.restaurantId,
      },
    })
  }
}
