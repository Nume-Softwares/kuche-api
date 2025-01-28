import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  Post,
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
import { TokenPayloadRestaurantSchema } from '../auth/jwt.strategy'
import { ZodValidationPipe } from '@/http/shared/pipes/zod-valitation-pipe'
import { z } from 'zod'
import { CurrentRestaurant } from '../../current-restaurant.decorator'
import { hash } from 'bcryptjs'

const createMemberRestaurantSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
  roleId: z.string(),
})

export class CreateMemberRestaurantDto {
  @ApiProperty({
    description: 'Nome do funcionário',
    example: 'restaurante@xyz.com',
  })
  name!: string

  @ApiProperty({
    description: 'Email do funcionario',
    example: 'example@email.com',
  })
  email!: string

  @ApiProperty({
    description: 'Senha do funcionario',
    example: '12345678',
  })
  password!: string

  @ApiProperty({
    description: 'Senha do funcionario',
    example: '05c34764-fd23-4f48-9879-c1bd8074b4b7',
  })
  roleId!: string
}

type TypeCreateMemberRestaurantSchema = z.infer<
  typeof createMemberRestaurantSchema
>

@ApiTags('Restaurante')
@ApiBearerAuth('access-token')
@Controller('/restaurant/members')
export class CreateMemberRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Criar um membro' })
  @ApiBody({
    description: 'Parâmetros necessários para criar um membro',
    type: CreateMemberRestaurantDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Cria um membro para o restaurante',
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  @ApiResponse({ status: 409, description: 'Conflito' })
  async handle(
    @CurrentRestaurant() payload: TokenPayloadRestaurantSchema,
    @Body(new ZodValidationPipe(createMemberRestaurantSchema))
    body: TypeCreateMemberRestaurantSchema,
  ) {
    const { email, name, password, roleId } = body

    const memberWithSameEmail = await this.prisma.member.findUnique({
      where: { email },
    })

    if (memberWithSameEmail) {
      throw new ConflictException(
        'User with same e-mail address already exists',
      )
    }

    const hashedPassword = await hash(password, 8)

    await this.prisma.member.create({
      data: {
        email,
        name,
        passwordHash: hashedPassword,
        roleId: roleId,
        restaurantId: payload.sub,
      },
    })
  }
}
