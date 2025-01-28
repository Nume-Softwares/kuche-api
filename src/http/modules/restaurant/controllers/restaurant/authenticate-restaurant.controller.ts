import {
  Body,
  Controller,
  HttpCode,
  Post,
  UnauthorizedException,
  UsePipes,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import {
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { compare } from 'bcryptjs'
import { ZodValidationPipe } from '@/http/shared/pipes/zod-valitation-pipe'
import { PrismaService } from '@/prisma/prisma.service'
import { z } from 'zod'
import { Public } from '../../auth/public'

const authenticateRestaurantBodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export class AuthenticateRestaurantDto {
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

type AuthenticateRestaurantBody = z.infer<
  typeof authenticateRestaurantBodySchema
>

@ApiTags('Restaurante')
@Controller('/restaurant/sign-in')
@Public()
export class AuthenticateRestaurantController {
  constructor(private jwt: JwtService, private prisma: PrismaService) {}

  @Post()
  @HttpCode(201)
  @UsePipes(new ZodValidationPipe(authenticateRestaurantBodySchema))
  @ApiOperation({ summary: 'Login restaurante' })
  @ApiBody({
    description: 'Parâmetros necessários para fazer o login como restaurante',
    type: AuthenticateRestaurantDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Retorna o token de autenticação',
    // schema: {
    //   example: {
    //     access_token:
    //       'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjYTNhYjRmOS00OGE4LTQzZjEtOTRmOS1iOWMzOGE2NDAyMjQiLCJpYXQiOjE3Mzc3NjA1MjV9.wa0FRO3nHdIClKrl6DxBetVql2-UbrWf951nw3Pemzz2Lm44V9aNx24nNR8BOlXBZX0lLZG9j_JxEoJZcWhznMnpblpDvT8sdln7bwTPHzoaQzvX0ozkRlu9nKoadfI8hjH98STSFNBzogPpMhKT4khnkdbZkjr-eCiNhhrcOP9SeVPDnAhVy_27RsRnFB6ugI7M-ZevyLUwoZwzt7m4HkOkNjplJZp1HE0h1O9fAEEBitysT3tYyz380azuU5VTfCxtWc4mFfoL9nosYHl20CIqKwYZkM5yAsGqXHeFXWOGFCD13i0eexJ2NYaiG5yPvw0GTYYyWF0-Dwl6bsgw5w',
    //   },
    // },
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  async handle(@Body() body: AuthenticateRestaurantBody) {
    const { email, password } = body

    const user = await this.prisma.restaurant.findUnique({
      where: { email },
    })

    if (!user) {
      throw new UnauthorizedException('User credentials do not match')
    }

    const isPasswordValid = await compare(password, user.passwordHash)

    if (!isPasswordValid) {
      throw new UnauthorizedException('User credentials do not match')
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    }
  }
}
