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

@ApiTags('Complementos')
@ApiBearerAuth('access-token')
@Controller('/restaurant/menu-item-option')
export class GetComplementsRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Lista todas os complementos' })
  @ApiResponse({
    status: 200,
    description: 'Retorna todos os complementos',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Query('page', queryValidationPipe) page: PageQueryParamSchema,
    @Query('search', searchValidationPipe) search: SearchQueryParamSchema,
  ) {
    const perPage = 8

    const totalComplements = await this.prisma.menuItemOption.count({
      where: {
        restaurantId: payload.restaurantId,
        OR: search
          ? [{ name: { contains: search, mode: 'insensitive' } }]
          : undefined,
      },
    })

    if (totalComplements === 0) {
      return { members: [], totalPages: 0 }
    }

    const totalPages = Math.ceil(totalComplements / perPage)

    const getComplements = await this.prisma.menuItemOption.findMany({
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
        price: true,
        isActive: true,
      },
    })

    const formattedComplements = getComplements.map((complement) => ({
      ...complement,
      price: parseFloat(parseFloat(complement.price.toString()).toFixed(2)),
    }))

    return { complements: formattedComplements, totalPages }
  }
}
