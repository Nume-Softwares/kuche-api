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
import { compare, hash } from 'bcryptjs'

const updateMemberIdRestaurantSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  roleId: z.string(),
})

const getMemberIdRestaurantSchema = z.string()

type GetMemberIdRestaurantSchema = z.infer<typeof getMemberIdRestaurantSchema>
export class UpdateMemberIdRestaurantDto {
  @ApiProperty({
    description: 'Nome do Membro',
    example: 'Ewerton Igor',
  })
  name!: string

  @ApiProperty({
    description: 'Nome do Membro',
    example: 'ewertonigor@email.com',
  })
  email!: string

  @ApiProperty({
    description: 'Senha atual do Membro',
    example: 'senha123',
  })
  currentPassword!: string

  @ApiProperty({
    description: 'Nova senha do Membro',
    example: 'senha123',
  })
  newPassword!: string

  @ApiProperty({
    description: 'ID do Cargo',
    example: 'bb4c37fb-aea8-413a-ad5c-69c6f2f17e37',
  })
  roleId!: string
}

type TypeUpdateMemberIdRestaurantSchema = z.infer<
  typeof updateMemberIdRestaurantSchema
>

@ApiTags('Membro')
@ApiBearerAuth('access-token')
@Controller('/restaurant/member')
export class UpdateMemberIdRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Patch(':memberId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Atualiza o Membro' })
  @ApiBody({
    description: 'Parâmetros necessários para atualizar o membro',
    type: UpdateMemberIdRestaurantDto,
  })
  @ApiResponse({
    status: 204,
    description: 'Membro atualizado!',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  @ApiResponse({ status: 404, description: 'Membro não encontrado' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Param('memberId')
    memberId: GetMemberIdRestaurantSchema,
    @Body(new ZodValidationPipe(updateMemberIdRestaurantSchema))
    body: TypeUpdateMemberIdRestaurantSchema,
  ) {
    const { name, currentPassword, newPassword, roleId, email } = body

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

    if (currentPassword && newPassword) {
      const matchPassword =
        memberExists.passwordHash &&
        (await compare(currentPassword, memberExists.passwordHash))

      if (!matchPassword) {
        throw new UnauthorizedException('Unauthorized - wrong password')
      }

      const hashedPassword = await hash(newPassword, 8)

      await this.prisma.member.update({
        data: {
          passwordHash: hashedPassword,
        },
        where: {
          id: memberExists.id,
          restaurantId: payload.restaurantId,
        },
      })
    }

    const existingEmail = await this.prisma.member.findFirst({
      where: {
        email,
        restaurantId: payload.restaurantId,
        id: { not: memberId },
      },
    })

    if (existingEmail) {
      throw new UnauthorizedException('Email already in use by another member')
    }

    const updateMember = await this.prisma.member.update({
      data: {
        name,
        email,
        roleId,
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
        event: 'Atualizou um membro',
        description: '',
        logType: 'UPDATE',
        affectedEntity: 'MEMBER',
        affectedId: updateMember.id,
        memberId: payload.sub,
        restaurantId: payload.restaurantId,
      },
    })
  }
}
