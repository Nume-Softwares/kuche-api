import { Controller, Get, HttpCode, Query } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { PrismaService } from '@/prisma/prisma.service'
import { TokenPayloadRestaurantSchema } from '../../auth/jwt.strategy'
import { ZodValidationPipe } from '@/http/shared/pipes/zod-valitation-pipe'
import { z } from 'zod'
import { CurrentRestaurant } from '../../../current-restaurant.decorator'

const pageQueryParamSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().min(1))

type PageQueryParamSchema = z.infer<typeof pageQueryParamSchema>

const queryValidationPipe = new ZodValidationPipe(pageQueryParamSchema)

@ApiTags('Membro')
@ApiBearerAuth('access-token')
@Controller('/restaurant/members')
export class GetMembersRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Listar Membros' })
  @ApiResponse({
    status: 200,
    description: 'Retorna todos os membros do restaurante',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Query('page', queryValidationPipe) page: PageQueryParamSchema,
  ) {
    const perPage = 8

    const totalMembers = await this.prisma.member.count({
      where: {
        restaurantId: payload.restaurantId,
      },
    })

    if (totalMembers === 0) {
      return { members: [], totalPages: 0 }
    }

    const totalPages = Math.ceil(totalMembers / perPage)

    const getMembers = await this.prisma.member.findMany({
      take: perPage,
      skip: (page - 1) * perPage,
      where: {
        restaurantId: payload.restaurantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return { members: getMembers, totalPages }
  }
}
