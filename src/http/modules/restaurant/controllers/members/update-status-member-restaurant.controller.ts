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

const updateStatusMemberRestaurantSchema = z.object({
  isActive: z.boolean(),
})

const getMemberIdRestaurantSchema = z.string()

type GetMemberIdRestaurantSchema = z.infer<typeof getMemberIdRestaurantSchema>

const queryValidationPipe = new ZodValidationPipe(getMemberIdRestaurantSchema)

export class UpdateStatusMemberRestaurantDto {
  @ApiProperty({
    description: 'Ativar ou Desativar Membro',
    example: false,
  })
  isActive!: boolean
}

type TypeUpdateStatusMemberRestaurantSchema = z.infer<
  typeof updateStatusMemberRestaurantSchema
>

@ApiTags('Membro')
@ApiBearerAuth('access-token')
@Controller('/restaurant/members/:memberId/status')
export class UpdateStatusMemberRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Patch()
  @HttpCode(204)
  @ApiOperation({ summary: 'Atualiza o Status do Membro' })
  @ApiBody({
    description: 'Parâmetros necessários para atualizar o status do membro',
    type: UpdateStatusMemberRestaurantDto,
  })
  @ApiResponse({
    status: 204,
    description: 'Status do membro atualizado!',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  @ApiResponse({ status: 404, description: 'Membro não encontrado' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Param('memberId', queryValidationPipe)
    memberId: GetMemberIdRestaurantSchema,
    @Body(new ZodValidationPipe(updateStatusMemberRestaurantSchema))
    body: TypeUpdateStatusMemberRestaurantSchema,
  ) {
    const { isActive } = body

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

    const memberExists = await this.prisma.member.findUnique({
      where: {
        id: memberId,
        restaurantId: payload.restaurantId,
      },
    })

    if (!memberExists) {
      throw new NotFoundException('Member not found')
    }

    const updateStatusMember = await this.prisma.member.update({
      data: {
        isActive: isActive,
      },
      where: {
        id: memberId,
        restaurantId: payload.restaurantId,
      },
      select: {
        id: true,
      },
    })

    await this.prisma.log.create({
      data: {
        event: 'Atualizou o status do membro',
        description: '',
        logType: 'UPDATE',
        affectedEntity: 'MEMBER',
        affectedId: updateStatusMember.id,
        memberId: payload.sub,
        restaurantId: payload.restaurantId,
      },
    })
  }
}
