import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './pnpm/auth/auth.module';
import { AuthController } from './auth/auth.controller';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { MembershipsModule } from './memberships/memberships.module';
import { ProductsModule } from './products/products.module';
import { BillingModule } from './billing/billing.module';
import { EntitlementsModule } from './entitlements/entitlements.module';

@Module({
  imports: [AuthModule, UsersModule, OrganizationsModule, MembershipsModule, ProductsModule, BillingModule, EntitlementsModule],
  controllers: [AppController, AuthController],
  providers: [AppService],
})
export class AppModule { }
