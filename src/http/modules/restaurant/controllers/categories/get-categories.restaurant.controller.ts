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

@ApiTags('Categorias')
@ApiBearerAuth('access-token')
@Controller('/restaurant/categories')
export class GetCategoriesRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Lista todas as categorias' })
  @ApiResponse({
    status: 200,
    description: 'Retorna todas as categorias',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Query('page', queryValidationPipe) page: PageQueryParamSchema,
    @Query('search', searchValidationPipe) search: SearchQueryParamSchema,
  ) {
    const perPage = 8

    const totalCategories = await this.prisma.category.count({
      where: {
        restaurantId: payload.restaurantId,
        OR: search
          ? [{ name: { contains: search, mode: 'insensitive' } }]
          : undefined,
      },
    })

    if (totalCategories === 0) {
      return { members: [], totalPages: 0 }
    }

    const totalPages = Math.ceil(totalCategories / perPage)

    const getCategories = await this.prisma.category.findMany({
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
        isActive: true,
        _count: {
          select: {
            menuItems: true,
          },
        },
      },
    })

    const formattedCategories = getCategories.map(
      ({ _count, ...category }) => ({
        ...category,
        totalMenuItems: _count.menuItems,
      }),
    )

    return { categories: formattedCategories, totalPages }
  }
}
