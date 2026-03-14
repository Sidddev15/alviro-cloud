import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'supersecret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [BillingService],
  controllers: [BillingController],
})
export class BillingModule {}
