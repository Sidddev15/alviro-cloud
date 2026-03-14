import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BillingService } from './billing.service';

type CheckoutBody = {
  planId?: string;
};

@Controller()
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('checkout')
  async checkout(
    @Body() body: CheckoutBody,
    @Headers('authorization') authorization?: string,
  ) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : null;

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const payload = await this.jwtService.verifyAsync<{
      sub: string;
    }>(token, {
      secret: process.env.JWT_SECRET ?? 'supersecret',
    });

    return this.billingService.checkout({
      planId: body.planId,
      userId: payload.sub,
    });
  }
}
