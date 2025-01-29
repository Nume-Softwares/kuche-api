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

const updateMenuItemRestaurantSchema = z.object({
  menuItemId: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  categoryId: z.string(),
})

export class UpdateMenuItemRestaurantDto {
  @ApiProperty({
    description: 'ID do Item',
    example: 'f879673d-af12-4f26-ac12-ccf5fcc57418',
  })
  menuItemId!: string

  @ApiProperty({
    description: 'Nome do Item',
    example: 'Pizza de Calabresa',
  })
  name!: string

  @ApiProperty({
    description: 'Conteúdo da descrição',
    example: 'Pizza recheada com queijo e calabresa',
  })
  description!: string

  @ApiProperty({
    description: 'Preço do item',
    example: 30.0,
  })
  price!: number

  @ApiProperty({
    description: 'ID da Categoria',
    example: 'c29tZXN0dXJlcy1jdXN0LWRlZmF1bHQ=',
  })
  categoryId!: string
}

type TypeUpdateMenuItemRestaurantSchema = z.infer<
  typeof updateMenuItemRestaurantSchema
>

@ApiTags('Item Menu')
@ApiBearerAuth('access-token')
@Controller('/restaurant/menu-item')
export class UpdateMenuItemRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Patch()
  @HttpCode(204)
  @ApiOperation({ summary: 'Atualizar um Item do Menu' })
  @ApiBody({
    description: 'Parâmetros necessários para atualizar um MenuItem',
    type: UpdateMenuItemRestaurantDto,
  })
  @ApiResponse({
    status: 204,
    description: 'Item do Menu atualizado!',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  @ApiResponse({ status: 404, description: 'MenuItem não encontrado' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Body(new ZodValidationPipe(updateMenuItemRestaurantSchema))
    body: TypeUpdateMenuItemRestaurantSchema,
  ) {
    const { categoryId, name, description, menuItemId, price } = body

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

    const menuItemExists = await this.prisma.menuItem.findUnique({
      where: {
        id: menuItemId,
        restaurantId: payload.restaurantId,
      },
    })

    if (!menuItemExists) {
      throw new NotFoundException('Menu Item not found')
    }

    const updateMenuItem = await this.prisma.menuItem.update({
      data: {
        name,
        price,
        description,
        categoryId,
      },
      where: {
        id: menuItemId,
        restaurantId: payload.restaurantId,
      },
      select: {
        id: true,
      },
    })

    await this.prisma.log.create({
      data: {
        event: 'Atualizou uma item no menu',
        description: '',
        logType: 'UPDATE',
        affectedEntity: 'MENU_ITEM',
        affectedId: updateMenuItem.id,
        memberId: payload.sub,
        restaurantId: payload.restaurantId,
      },
    })
  }
}
