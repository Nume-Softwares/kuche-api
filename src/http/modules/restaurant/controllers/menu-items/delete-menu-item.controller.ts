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

const deleteMenuItemRestaurantSchema = z.string().uuid()

type DeleteMenuItemIdRestaurantSchema = z.infer<
  typeof deleteMenuItemRestaurantSchema
>

const queryValidationPipe = new ZodValidationPipe(
  deleteMenuItemRestaurantSchema,
)
export class DeleteMenuItemRestaurantDto {
  @ApiProperty({
    description: 'ID do Membro',
    example: 'c9ce5fb1-9785-4fae-9011-14403989f1d0',
  })
  menuItemId!: string
}

@ApiTags('Item Menu')
@ApiBearerAuth('access-token')
@Controller('/restaurant/menu-item')
export class DeleteMenuItemRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Delete(':menuItemId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Deletar um Item no Menu' })
  @ApiBody({
    description: 'Parâmetros necessários para deletar um item no menu',
    type: DeleteMenuItemRestaurantDto,
  })
  @ApiResponse({
    status: 204,
    description: 'Item no menu deletado!',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Param('menuItemId', queryValidationPipe)
    menuItemId: DeleteMenuItemIdRestaurantSchema,
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

    const menuItemExists = await this.prisma.menuItem.findUnique({
      where: {
        id: menuItemId,
        restaurantId: payload.restaurantId,
      },
    })

    if (!menuItemExists) {
      throw new NotFoundException('Member not found')
    }

    const deleteMenuItem = await this.prisma.menuItem.delete({
      where: {
        id: menuItemId,
        restaurantId: payload.restaurantId,
      },
    })

    await this.prisma.log.create({
      data: {
        event: 'Deletou um item no menu',
        description: '',
        logType: 'DELETE',
        affectedEntity: 'MENU_ITEM',
        affectedId: deleteMenuItem.id,
        memberId: payload.sub,
        restaurantId: payload.restaurantId,
      },
    })
  }
}
