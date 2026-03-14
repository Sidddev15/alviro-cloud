import { Body, Controller, Post } from '@nestjs/common';
import { BillingService } from './billing.service';

type CheckoutBody = {
  planId?: string;
  organizationId?: string;
};

@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  checkout(@Body() body: CheckoutBody) {
    return this.billingService.checkout(body);
  }
}
