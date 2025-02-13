import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { Env } from './env'
import { NestExpressApplication } from '@nestjs/platform-express'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {})

  const configService = app.get<ConfigService<Env, true>>(ConfigService)

  const port = configService.get('PORT', { infer: true })

  app.useBodyParser('json', { limit: '10mb' })

  app.enableCors({
    origin: configService.get('PORT_DEV'),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })

  const config = new DocumentBuilder()
    .setTitle('Kuche API')
    .setDescription('API para gerenciamento do software')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'Bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build()

  const documentFactory = () => SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, documentFactory)

  await app.listen(port)
}

bootstrap()
