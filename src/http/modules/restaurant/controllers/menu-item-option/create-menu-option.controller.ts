import {
  Body,
  Controller,
  HttpCode,
  Post,
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

const createMenuItemOptionRestaurantSchema = z.object({
  name: z.string(),
  price: z.number(),
})

export class CreateMenuItemOptionRestaurantDto {
  @ApiProperty({
    description: 'Nome do Item',
    example: 'Pizza de Calabresa',
  })
  name!: string

  @ApiProperty({
    description: 'Preço do item',
    example: 30.0,
  })
  price!: number
}

type TypeCreateMenuItemOptionRestaurantSchema = z.infer<
  typeof createMenuItemOptionRestaurantSchema
>

@ApiTags('Menu Item Option')
@ApiBearerAuth('access-token')
@Controller('/restaurant/menu-item-option')
export class CreateMenuItemOptionRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @HttpCode(204)
  @ApiOperation({ summary: 'Cria um complemento para o item' })
  @ApiBody({
    description: 'Parâmetros necessários para criar um complemento no item',
    type: CreateMenuItemOptionRestaurantDto,
  })
  @ApiResponse({
    status: 204,
    description: 'Complemento para itens criado!',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Body(new ZodValidationPipe(createMenuItemOptionRestaurantSchema))
    body: TypeCreateMenuItemOptionRestaurantSchema,
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
      !['Admin', 'Gerente', 'Suporte Técnico', 'Marketing'].includes(
        getMember.role.name,
      )
    ) {
      throw new UnauthorizedException('You are not allowed to do this')
    }

    const newMenuItemOption = await this.prisma.menuItemOption.create({
      data: {
        name,
        price,
        restaurantId: payload.restaurantId,
      },
      select: {
        id: true,
      },
    })

    await this.prisma.log.create({
      data: {
        event: 'Criou um complemento',
        description: '',
        logType: 'CREATE',
        affectedEntity: 'MENU_ITEM_OPTIONS',
        affectedId: newMenuItemOption.id,
        memberId: payload.sub,
        restaurantId: payload.restaurantId,
      },
    })
  }
}
