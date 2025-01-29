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

const updateStatusMenuItemSchema = z.object({
  menuItemId: z.string(),
  isActive: z.boolean(),
})

export class UpdateStatusMenuItemRestaurantDto {
  @ApiProperty({
    description: 'ID do Item',
    example: 'f879673d-af12-4f26-ac12-ccf5fcc57418',
  })
  menuItemId!: string

  @ApiProperty({
    description: 'Ativar ou Desativar Item do Menu?',
    example: false,
  })
  isActive!: boolean
}

type TypeUpdateStatusMenuItemSchema = z.infer<typeof updateStatusMenuItemSchema>

@ApiTags('Item Menu')
@ApiBearerAuth('access-token')
@Controller('/restaurant/status-menu-item')
export class UpdateStatusMenuItemRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Patch()
  @HttpCode(204)
  @ApiOperation({ summary: 'Atualizar o status do menu-item' })
  @ApiBody({
    description: 'Parâmetros necessários para atualizar o status do menu-item',
    type: UpdateStatusMenuItemRestaurantDto,
  })
  @ApiResponse({
    status: 204,
    description: 'Status do item-menu atualizado!',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  @ApiResponse({ status: 404, description: 'MenuItem não encontrada' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Body(new ZodValidationPipe(updateStatusMenuItemSchema))
    body: TypeUpdateStatusMenuItemSchema,
  ) {
    const { menuItemId, isActive } = body

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
        isActive,
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
        event: 'Atualizou o status do item-menu',
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
