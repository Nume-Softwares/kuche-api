import { Controller, Get, HttpCode, Query } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { PrismaService } from '@/prisma/prisma.service'
import { ZodValidationPipe } from '@/http/shared/pipes/zod-valitation-pipe'
import { z } from 'zod'
import { CurrentRestaurant } from '@/http/modules/current-restaurant.decorator'
import { TokenPayloadRestaurantSchema } from '../../auth/jwt.strategy'
import { S3Service } from '@/http/shared/services/s3.service' // Importa o S3Service para gerar URLs temporárias

const pageQueryParamSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().min(1))

type PageQueryParamSchema = z.infer<typeof pageQueryParamSchema>

const queryValidationPipe = new ZodValidationPipe(pageQueryParamSchema)

const searchQueryParamSchema = z.string().optional().default('')

const searchValidationPipe = new ZodValidationPipe(searchQueryParamSchema)

type SearchQueryParamSchema = z.infer<typeof searchQueryParamSchema>

@ApiTags('Item Menu')
@ApiBearerAuth('access-token')
@Controller('/restaurant/menu-item')
export class GetMenuItemsRestaurantController {
  constructor(private prisma: PrismaService, private s3Service: S3Service) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Lista todas os produtos' })
  @ApiResponse({
    status: 200,
    description: 'Retorna todos os produtos',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Query('page', queryValidationPipe) page: PageQueryParamSchema,
    @Query('search', searchValidationPipe) search: SearchQueryParamSchema,
  ) {
    const perPage = 8

    const totalMenuItem = await this.prisma.menuItem.count({
      where: {
        restaurantId: payload.restaurantId,
        OR: search
          ? [{ name: { contains: search, mode: 'insensitive' } }]
          : undefined,
      },
    })

    if (totalMenuItem === 0) {
      return { members: [], totalPages: 0 }
    }

    const totalPages = Math.ceil(totalMenuItem / perPage)

    const getMenuItems = await this.prisma.menuItem.findMany({
      take: perPage,
      skip: (page - 1) * perPage,
      where: {
        restaurantId: payload.restaurantId,
        OR: search
          ? [{ name: { contains: search, mode: 'insensitive' } }]
          : undefined,
      },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        price: true,
        isActive: true,
        categoryId: true,
        options: {
          select: {
            option: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    })

    const formattedMenuItems = await Promise.all(
      getMenuItems.map(async (menuItem) => {
        let imageUrl = menuItem.imageUrl || null

        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = await this.s3Service.getSignedUrl(
            'kuchi-images',
            menuItem.imageUrl || '',
          )
        }

        return {
          ...menuItem,
          price: parseFloat(parseFloat(menuItem.price.toString()).toFixed(2)),
          options: menuItem.options.map(({ option }) => ({
            id: option.id,
            name: option.name,
            price: parseFloat(parseFloat(option.price.toString()).toFixed(2)),
          })),
          imageUrl,
        }
      }),
    )

    return { menuItems: formattedMenuItems, totalPages }
  }
}
