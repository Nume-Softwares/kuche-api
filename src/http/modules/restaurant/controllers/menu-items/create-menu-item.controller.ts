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

const createMenuItemRestaurantControllerSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.number(),
  categoryId: z.string(),
})

export class CreateMenuItemRestaurantDto {
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

type TypeCreateMenuItemRestaurantControllerSchema = z.infer<
  typeof createMenuItemRestaurantControllerSchema
>

@ApiTags('Item Menu')
@ApiBearerAuth('access-token')
@Controller('/restaurant/menu-item')
export class CreateMenuItemRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @HttpCode(204)
  @ApiOperation({ summary: 'Cria um item no menu' })
  @ApiBody({
    description: 'Parâmetros necessários para criar um item no menu',
    type: CreateMenuItemRestaurantDto,
  })
  @ApiResponse({
    status: 204,
    description: 'Cria uma categoria para o restaurante',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Body(new ZodValidationPipe(createMenuItemRestaurantControllerSchema))
    body: TypeCreateMenuItemRestaurantControllerSchema,
  ) {
    const { name, categoryId, description, price } = body

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

    const newMenuItem = await this.prisma.menuItem.create({
      data: {
        name,
        description: description,
        price: price,
        categoryId: categoryId,
        restaurantId: payload.restaurantId,
      },
      select: {
        id: true,
      },
    })

    await this.prisma.log.create({
      data: {
        event: 'Criou uma item no menu',
        description: '',
        logType: 'CREATE',
        affectedEntity: 'MENU_ITEM',
        affectedId: newMenuItem.id,
        memberId: payload.sub,
        restaurantId: payload.restaurantId,
      },
    })
  }
}
