import { Injectable } from '@nestjs/common'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { ConfigService } from '@nestjs/config'
import { Env } from '@/env'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client

  constructor(private configService: ConfigService<Env, true>) {
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    })
  }

  async uploadFile(bucket: string, key: string, body: Buffer) {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
    })

    await this.s3Client.send(command)
  }

  async getSignedUrl(bucket: string, key: string, expiresIn: number = 3600) {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    return await getSignedUrl(this.s3Client, command, { expiresIn })
  }

  async deleteFile(bucket: string, key: string) {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    await this.s3Client.send(command)
  }
}
