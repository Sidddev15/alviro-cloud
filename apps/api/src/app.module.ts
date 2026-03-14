import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { MembershipsModule } from './memberships/memberships.module';
import { ProductsModule } from './products/products.module';
import { BillingModule } from './billing/billing.module';
import { EntitlementsModule } from './entitlements/entitlements.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`${process.cwd()}/apps/api/.env`, `${process.cwd()}/.env`],
    }),
    AuthModule,
    UsersModule,
    OrganizationsModule,
    MembershipsModule,
    ProductsModule,
    BillingModule,
    EntitlementsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
