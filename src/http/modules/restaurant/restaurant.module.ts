import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { Env } from '@/env'
import { PrismaService } from '@/prisma/prisma.service'
import { APP_GUARD } from '@nestjs/core'
import { JwtAuthGuard } from './auth/jwt-auth.guard'
import { AuthRestaurantModule } from './auth/authRestaurant.module'
import { CreateCategoryRestaurantController } from './controllers/categories/create-category.restaurant.controller'
import { GetCategoriesRestaurantController } from './controllers/categories/get-categories.restaurant.controller'
import { StatusCategoryRestaurantController } from './controllers/categories/status-category.restaurant.controller'
import { UpdateCategoryRestaurantController } from './controllers/categories/update-category.restaurant.controller'
import { GetMembersRestaurantController } from './controllers/members/get-members-restaurant.controller'
import { CreateMemberRestaurantController } from './controllers/members/create-member-restaurant.controller'
import { CreateRestaurantController } from './controllers/restaurant/create-restaurant.controller'
import { CreateRoleRestaurantController } from './controllers/roles/create-role-restaurant.controller'
import { GetRolesRestaurantController } from './controllers/roles/get-roles-restaurant.controller'
import { AuthenticateMemberController } from './controllers/members/authenticate-member-restaurant.controller'
import { CreateMenuItemRestaurantController } from './controllers/menu-items/create-menu-item.controller'
import { UpdateMenuItemRestaurantController } from './controllers/menu-items/edit-menu-item.controller'
import { UpdateStatusMenuItemRestaurantController } from './controllers/menu-items/update-status-menu-item.controller'
import { DeleteCategoryRestaurantController } from './controllers/categories/delete-category.restaurant.controller'
import { DeleteMemberRestaurantController } from './controllers/members/delete-member-restaurant.controller'
import { DeleteMenuItemRestaurantController } from './controllers/menu-items/delete-menu-item.controller'
import { CreateMenuItemOptionRestaurantController } from './controllers/menu-item-option/create-menu-option.controller'
import { UpdateStatusMemberRestaurantController } from './controllers/members/update-status-member-restaurant.controller'
import { GetMemberIdRestaurantController } from './controllers/members/get-member-id.controller'
import { UpdateMemberIdRestaurantController } from './controllers/members/update-member-id-restaurant.controller'
import { AuthenticateMemberGoogleController } from './controllers/members/authenticate-member-google-restaurant.controller'
import { GetCategoryIdRestaurantController } from './controllers/categories/get-category-id.restaurant.controller'

@Module({
  imports: [
    AuthRestaurantModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      global: true,
      useFactory(config: ConfigService<Env, true>) {
        const privateKey = config.get('JWT_PRIVATE_KEY_RESTAURANT', {
          infer: true,
        })
        const publicKey = config.get('JWT_PUBLIC_KEY_RESTAURANT', {
          infer: true,
        })

        return {
          signOptions: { algorithm: 'RS256' },
          privateKey: Buffer.from(privateKey, 'base64'),
          publicKey: Buffer.from(publicKey, 'base64'),
        }
      },
    }),
  ],
  controllers: [
    CreateCategoryRestaurantController,
    GetCategoriesRestaurantController,
    StatusCategoryRestaurantController,
    UpdateCategoryRestaurantController,
    DeleteCategoryRestaurantController,
    AuthenticateMemberController,
    CreateMemberRestaurantController,
    GetMembersRestaurantController,
    DeleteMemberRestaurantController,
    CreateRestaurantController,
    CreateRoleRestaurantController,
    GetRolesRestaurantController,
    CreateMenuItemRestaurantController,
    UpdateMenuItemRestaurantController,
    UpdateStatusMenuItemRestaurantController,
    DeleteMenuItemRestaurantController,
    CreateMenuItemOptionRestaurantController,
    UpdateStatusMemberRestaurantController,
    GetMemberIdRestaurantController,
    UpdateMemberIdRestaurantController,
    AuthenticateMemberGoogleController,
    GetCategoryIdRestaurantController,
  ],
  providers: [
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [PrismaService, AuthRestaurantModule, PassportModule],
})
export class RestaurantModule {}
