import {
  Controller,
  Get,
  Headers,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OrganizationsService } from './organizations.service';

@Controller('org')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly jwtService: JwtService,
  ) {}

  @Get(':id/entitlements')
  async getEntitlements(
    @Param('id') organizationId: string,
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
      organizationId?: string;
    }>(token, {
      secret: process.env.JWT_SECRET ?? 'supersecret',
    });

    if (payload.organizationId !== organizationId) {
      throw new UnauthorizedException(
        'You are not allowed to access this organization entitlements',
      );
    }

    return this.organizationsService.getEntitlementsForOrganization(organizationId);
  }
}
