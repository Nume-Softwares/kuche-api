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

const createCategoryRestaurantSchema = z.object({
  name: z.string(),
})

export class CreateCategoryRestaurantDto {
  @ApiProperty({
    description: 'Nome da Categoria',
    example: 'restaurante@xyz.com',
  })
  name!: string
}

type TypeCreateCategoryRestaurantSchema = z.infer<
  typeof createCategoryRestaurantSchema
>

@ApiTags('Categorias')
@ApiBearerAuth('access-token')
@Controller('/restaurant/categories')
export class CreateCategoryRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Criar uma categoria' })
  @ApiBody({
    description: 'Parâmetros necessários para criar uma categoria',
    type: CreateCategoryRestaurantDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Cria uma categoria para o restaurante',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Body(new ZodValidationPipe(createCategoryRestaurantSchema))
    body: TypeCreateCategoryRestaurantSchema,
  ) {
    const { name } = body

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

    const newCategory = await this.prisma.category.create({
      data: {
        name: name,
        restaurantId: payload.restaurantId,
      },
      select: {
        id: true,
      },
    })

    await this.prisma.log.create({
      data: {
        event: 'Criou uma Categoria',
        description: '',
        logType: 'CREATE',
        affectedEntity: 'CATEGORY',
        affectedId: newCategory.id,
        memberId: payload.sub,
        restaurantId: payload.restaurantId,
      },
    })
  }
}
