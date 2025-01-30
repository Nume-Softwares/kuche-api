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

const authenticateMemberBodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
  restaurantId: z.string().uuid(),
})

export class AuthenticateMemberDto {
  @ApiProperty({
    description: 'E-mail do usuário',
    example: 'restaurante@xyz.com',
  })
  email!: string

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'senha123',
  })
  password!: string

  @ApiProperty({
    description: 'ID do Restaurant',
    example: 'ca3ab4f9-48a8-43f1-94f9-b9c38a640224',
  })
  restaurantId!: string
}

type AuthenticateRestaurantBody = z.infer<typeof authenticateMemberBodySchema>

@ApiTags('Membro')
@Controller('/restaurant/member/sign-in')
@Public()
export class AuthenticateMemberController {
  constructor(private jwt: JwtService, private prisma: PrismaService) {}

  @Post()
  @HttpCode(201)
  @UsePipes(new ZodValidationPipe(authenticateMemberBodySchema))
  @ApiOperation({ summary: 'Login Membro' })
  @ApiBody({
    description: 'Parâmetros necessários para fazer o login no restaurante',
    type: AuthenticateMemberDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Retorna o token de autenticação',
    schema: {
      example: {
        access_token:
          'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjYTNhYjRmOS00OGE4LTQzZjEtOTRmOS1iOWMzOGE2NDAyMjQiLCJpYXQiOjE3Mzc3NjA1MjV9.wa0FRO3nHdIClKrl6DxBetVql2-UbrWf951nw3Pemzz2Lm44V9aNx24nNR8BOlXBZX0lLZG9j_JxEoJZcWhznMnpblpDvT8sdln7bwTPHzoaQzvX0ozkRlu9nKoadfI8hjH98STSFNBzogPpMhKT4khnkdbZkjr-eCiNhhrcOP9SeVPDnAhVy_27RsRnFB6ugI7M-ZevyLUwoZwzt7m4HkOkNjplJZp1HE0h1O9fAEEBitysT3tYyz380azuU5VTfCxtWc4mFfoL9nosYHl20CIqKwYZkM5yAsGqXHeFXWOGFCD13i0eexJ2NYaiG5yPvw0GTYYyWF0-Dwl6bsgw5w',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não Autorizado' })
  async handle(@Body() body: AuthenticateRestaurantBody) {
    const { email, password, restaurantId } = body

    const member = await this.prisma.member.findUnique({
      where: {
        email_restaurantId: {
          email,
          restaurantId,
        },
      },
    })

    if (!member) {
      throw new UnauthorizedException('User credentials do not match')
    }

    const isPasswordValid = await compare(password, member.passwordHash)

    if (!isPasswordValid) {
      throw new UnauthorizedException('User credentials do not match')
    }

    const accessToken = this.jwt.sign(
      { sub: member.id, restaurantId: restaurantId },
      { expiresIn: '1d' },
    )

    await this.prisma.log.create({
      data: {
        event: 'Entrou no Sistema',
        description: '',
        logType: 'LOGIN',
        affectedEntity: 'MEMBER',
        affectedId: member.id,
        memberId: member.id,
        restaurantId: restaurantId,
      },
    })

    return {
      id: member.id,
      email: member.email,
      name: member.name,
      access_token: accessToken,
    }
  }
}
