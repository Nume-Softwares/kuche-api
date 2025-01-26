import { Controller, Get, HttpCode, Query, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { PrismaService } from '@/prisma/prisma.service'
import { JwtAuthGuard } from '../jwt-auth.guard'
import { CurrentRestaurant } from '@/modules/current-restaurant.decorator'
import { TokenPayloadRestaurantSchema } from '../jwt.strategy'
import { ZodValidationPipe } from '@/pipes/zod-valitation-pipe'
import { z } from 'zod'

const pageQueryParamSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().min(1))

type PageQueryParamSchema = z.infer<typeof pageQueryParamSchema>

const queryValidationPipe = new ZodValidationPipe(pageQueryParamSchema)

@ApiTags('Restaurante')
@ApiBearerAuth('access-token')
@Controller('/restaurant/members')
@UseGuards(JwtAuthGuard)
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
    const perPage = 1

    const getMembers = await this.prisma.member.findMany({
      take: perPage,
      skip: (page - 1) * perPage,
      where: {
        restaurantId: payload.sub,
      },
    })

    return getMembers
  }
}
