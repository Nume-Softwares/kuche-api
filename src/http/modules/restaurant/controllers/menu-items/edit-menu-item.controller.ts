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
import { S3Service } from '@/http/shared/services/s3.service'
import { randomUUID } from 'node:crypto'
import { ConfigService } from '@nestjs/config'
import { Env } from '@/env'

const updateMenuItemRestaurantSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.number(),
  categoryId: z.string(),
  imageBase64: z.string().base64(),
  complementIds: z.array(z.string().uuid()),
})

const getMenuItemIdRestaurantSchema = z.string().uuid()

type GetMenuItemIdRestaurantSchema = z.infer<
  typeof getMenuItemIdRestaurantSchema
>

const queryValidationPipe = new ZodValidationPipe(getMenuItemIdRestaurantSchema)

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

  @ApiProperty({
    description: 'Imagem do item em base64',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  })
  imageBase64!: string
}

type TypeUpdateMenuItemRestaurantSchema = z.infer<
  typeof updateMenuItemRestaurantSchema
>

@ApiTags('Item Menu')
@ApiBearerAuth('access-token')
@Controller('/restaurant/menu-item')
export class UpdateMenuItemRestaurantController {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private configService: ConfigService<Env, true>,
  ) {}

  @Patch(':menuItemId')
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
    @Param('menuItemId', queryValidationPipe)
    menuItemId: GetMenuItemIdRestaurantSchema,
    @Body(new ZodValidationPipe(updateMenuItemRestaurantSchema))
    body: TypeUpdateMenuItemRestaurantSchema,
  ) {
    const { categoryId, name, description, price, imageBase64, complementIds } =
      body

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

    if (menuItemExists.imageUrl) {
      await this.s3Service.deleteFile(
        this.configService.get('AWS_BUCKET'),
        menuItemExists.imageUrl,
      )
    }

    const buffer = Buffer.from(imageBase64, 'base64')

    const key = `menu-items/${
      payload.restaurantId
    }/${Date.now()}-${randomUUID()}.png`

    await this.s3Service.uploadFile(
      this.configService.get('AWS_BUCKET'),
      key,
      buffer,
    )

    const updateMenuItem = await this.prisma.menuItem.update({
      data: {
        name,
        price,
        description,
        imageUrl: key,
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

    await this.prisma.menuItemOptionRelation.deleteMany({
      where: {
        menuItemId: menuItemExists.id,
      },
    })

    await this.prisma.menuItemOptionRelation.createMany({
      data: complementIds.map((optionId) => ({
        menuItemId: menuItemExists.id,
        optionId,
      })),
    })

    await this.prisma.log.create({
      data: {
        event: 'Atualizou um item no menu',
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
