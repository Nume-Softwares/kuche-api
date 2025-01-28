import { ConflictException, UsePipes } from '@nestjs/common'
import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import {
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { hash } from 'bcryptjs'
import { ZodValidationPipe } from '@/http/shared/pipes/zod-valitation-pipe'
import { PrismaService } from '@/prisma/prisma.service'
import { z } from 'zod'
import { Public } from '../auth/public'

const createRestaurantBodySchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
})

export class CreateRestaurantDto {
  @ApiProperty({
    description: 'Nome do restaurante',
    example: 'Restaurante XYZ',
  })
  name!: string

  @ApiProperty({
    description: 'E-mail do restaurante',
    example: 'restaurante@xyz.com',
  })
  email!: string

  @ApiProperty({
    description: 'Senha do restaurante',
    example: 'senha123',
  })
  password!: string
}

type CreateRestaurantBody = z.infer<typeof createRestaurantBodySchema>

@ApiTags('Restaurante')
@Controller('/restaurant/sign-up')
@Public()
export class CreateRestaurantController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @HttpCode(201)
  @UsePipes(new ZodValidationPipe(createRestaurantBodySchema))
  @ApiOperation({ summary: 'Cadastra um restaurante' })
  @ApiBody({
    description: 'Parâmetros necessários para cadastrar um novo restaurante',
    type: CreateRestaurantDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Retorna os dados do restaurante',
    schema: {
      example: {
        name: 'Restaurante XYZ',
        email: 'restaurante@xyz.com',
        passwordHash: 'hashedpassword123',
      },
    },
  })
  @ApiResponse({ status: 409, description: 'E-mail já existe' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async handle(@Body() body: CreateRestaurantBody) {
    const { name, email, password } = body

    const restaurantWithSameEmail = await this.prisma.restaurant.findUnique({
      where: { email },
    })

    if (restaurantWithSameEmail) {
      throw new ConflictException(
        'User with same e-mail address already exists',
      )
    }

    const hashedPassword = await hash(password, 8)

    await this.prisma.restaurant.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
      },
    })
  }
}
