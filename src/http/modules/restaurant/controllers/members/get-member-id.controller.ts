import {
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
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
import { TokenPayloadRestaurantSchema } from '../../auth/jwt.strategy'
import { ZodValidationPipe } from '@/http/shared/pipes/zod-valitation-pipe'
import { z } from 'zod'
import { CurrentRestaurant } from '../../../current-restaurant.decorator'

const getMemberIdRestaurantSchema = z.string().uuid()

type GetMemberIdRestaurantSchema = z.infer<typeof getMemberIdRestaurantSchema>

const queryValidationPipe = new ZodValidationPipe(getMemberIdRestaurantSchema)

export class GetMemberIdrRestaurantDto {
  @ApiProperty({
    description: 'ID do Membro',
    example: 'c9ce5fb1-9785-4fae-9011-14403989f1d0',
  })
  memberId!: string
}

@ApiTags('Membro')
@ApiBearerAuth('access-token')
@Controller('/restaurant/member')
export class GetMemberIdRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Get(':memberId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Buscar dados do membro' })
  @ApiResponse({
    status: 200,
    description: 'Retorna todos os dados disponiveis do membro',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Param('memberId', queryValidationPipe)
    memberId: GetMemberIdRestaurantSchema,
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

    const member = await this.prisma.member.findUnique({
      where: {
        id: memberId,
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

    if (!member) {
      throw new NotFoundException('Member not found')
    }

    return member
  }
}
