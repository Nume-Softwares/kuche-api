import { AppModule } from '@/app.module'
import { PrismaService } from '@/prisma/prisma.service'
import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { hash } from 'bcryptjs'
import request from 'supertest'

describe('Create Category (E2E)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let jwt: JwtService

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()

    prisma = moduleRef.get(PrismaService)
    jwt = moduleRef.get(JwtService)

    await app.init()
  })

  test('[POST] Category /restaurant/categories', async () => {
    const restaurant = await prisma.restaurant.create({
      data: {
        name: 'Restaurante A',
        email: 'restaurante@email.com',
        passwordHash: await hash('password123', 10),
      },
      select: {
        id: true,
      },
    })

    const role = await prisma.role.create({
      data: {
        name: 'Admin',
      },
      select: {
        id: true,
      },
    })

    const member = await prisma.member.create({
      data: {
        name: 'Ewerton Igor',
        email: 'ewerton@email.com',
        passwordHash: await hash('password123', 10),
        roleId: role.id,
        restaurantId: restaurant.id,
      },
      select: {
        id: true,
        restaurantId: true,
      },
    })

    const accessToken = jwt.sign({
      sub: member.id,
      restaurantId: member.restaurantId,
    })

    const response = await request(app.getHttpServer())
      .post('/restaurant/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Pizzas',
      })

    expect(response.status).toBe(201)

    const findMenuItem = await prisma.menuItem.findFirst({
      where: {
        restaurantId: restaurant.id,
        name: 'Pizzas',
      },
    })

    console.log('meu findMenu', findMenuItem)

    expect(findMenuItem).toBeTruthy()
  })
})
