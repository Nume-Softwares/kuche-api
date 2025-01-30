import {
  Controller,
  Delete,
  HttpCode,
  NotFoundException,
  Query,
  UnauthorizedException,
} from '@nestjs/common'
import {
  ApiBearerAuth,
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

const deleteMemberRestaurantSchema = z.string().uuid()

export class DeleteMemberRestaurantDto {
  @ApiProperty({
    description: 'ID do Membro',
    example: 'c9ce5fb1-9785-4fae-9011-14403989f1d0',
  })
  memberId!: string
}

type TypeDeleteMemberRestaurantSchema = z.infer<
  typeof deleteMemberRestaurantSchema
>

const queryValidationPipe = new ZodValidationPipe(deleteMemberRestaurantSchema)

@ApiTags('Membro')
@ApiBearerAuth('access-token')
@Controller('/restaurant/member')
export class DeleteMemberRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Deletar um Membro' })
  @ApiResponse({
    status: 204,
    description: 'Membro deletado!',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Query('memberId', queryValidationPipe)
    memberId: TypeDeleteMemberRestaurantSchema,
  ) {
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

    const deleteMember = await this.prisma.member.delete({
      where: {
        id: memberId,
        restaurantId: payload.restaurantId,
      },
    })

    await this.prisma.log.create({
      data: {
        event: 'Deletou um membro',
        description: '',
        logType: 'DELETE',
        affectedEntity: 'MEMBER',
        affectedId: deleteMember.id,
        memberId: payload.sub,
        restaurantId: payload.restaurantId,
      },
    })
  }
}
