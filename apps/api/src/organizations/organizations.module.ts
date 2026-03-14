import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'supersecret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [OrganizationsService],
  controllers: [OrganizationsController],
})
export class OrganizationsModule {}
