import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  Post,
  UsePipes,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { ZodValidationPipe } from '@/http/shared/pipes/zod-valitation-pipe'
import { PrismaService } from '@/prisma/prisma.service'
import { z } from 'zod'

const createRoleRestaurantBodySchema = z.object({
  name: z.string(),
})

export class CreateRoleRestaurantDto {
  @ApiProperty({
    description: 'Nome do Cargo',
    example: 'Financeiro',
  })
  name!: string
}

type CreateRoleRestaurantBody = z.infer<typeof createRoleRestaurantBodySchema>

@ApiTags('Permissões')
@ApiBearerAuth('access-token')
@Controller('/restaurant/role')
export class CreateRoleRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @HttpCode(204)
  @UsePipes(new ZodValidationPipe(createRoleRestaurantBodySchema))
  @ApiOperation({ summary: 'Cadastrar Role' })
  @ApiBody({
    description: 'Parâmetros necessários para criar uma role',
    type: CreateRoleRestaurantDto,
  })
  @ApiResponse({
    status: 204,
    description: 'Retorna nada',
  })
  @ApiResponse({
    status: 409,
    description: 'Erro de conflito',
    schema: {
      example: {
        message: 'Role with same name already exists',
        error: 'Conflict',
        statusCode: 409,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  async handle(@Body() body: CreateRoleRestaurantBody) {
    const roleWithSameName = await this.prisma.role.findFirst({
      where: { name: body.name },
    })

    if (roleWithSameName) {
      throw new ConflictException('Role with same name already exists')
    }

    await this.prisma.role.create({
      data: {
        name: body.name,
      },
    })
  }
}
