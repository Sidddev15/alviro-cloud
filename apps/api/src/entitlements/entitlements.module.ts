import { Module } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';
import { EntitlementsController } from './entitlements.controller';

@Module({
  providers: [EntitlementsService],
  controllers: [EntitlementsController]
})
export class EntitlementsModule {}
