import { Controller, Get, HttpCode } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { PrismaService } from '@/prisma/prisma.service'

@ApiTags('Permissões')
@ApiBearerAuth('access-token')
@Controller('/restaurant/role')
export class GetRolesRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Listar todas as Roles' })
  @ApiResponse({
    status: 200,
    description: 'Retorna todas as roles disponiveis',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  async handle() {
    const getRoles = await this.prisma.role.findMany({
      select: {
        id: true,
        name: true,
      },
    })

    return getRoles
  }
}
