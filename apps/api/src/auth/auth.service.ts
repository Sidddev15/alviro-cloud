import {
  BadRequestException,
  Injectable,
  OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class AuthService implements OnModuleDestroy {
  private readonly pool: Pool;
  private readonly prisma: PrismaClient;

  constructor(private readonly jwtService: JwtService) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }

    this.pool = new Pool({ connectionString });
    const adapter = new PrismaPg(this.pool);
    this.prisma = new PrismaClient({ adapter });
  }

  async login(input: { email?: string; password?: string }) {
    if (!input.email || !input.password) {
      throw new BadRequestException('email and password are required');
    }

    let user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, password: true },
    });

    if (!user && input.email === 'demo-owner@alviro.local' && input.password === 'demo-password') {
      user = await this.ensureDemoUserAndOrganization();
    }

    if (!user || user.password !== input.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const organizationId = await this.resolveOrganizationForUser(user.id);

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      organizationId,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        organizationId,
      },
    };
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    await this.pool.end();
  }

  private async ensureDemoUserAndOrganization() {
    const user = await this.prisma.user.upsert({
      where: { email: 'demo-owner@alviro.local' },
      update: {},
      create: {
        email: 'demo-owner@alviro.local',
        password: 'demo-password',
        firstName: 'Demo',
        lastName: 'Owner',
      },
      select: { id: true, email: true, password: true },
    });

    const org = await this.prisma.organization.findFirst({
      where: { ownerId: user.id },
      select: { id: true },
    });

    if (!org) {
      await this.prisma.organization.create({
        data: {
          lastName: 'Demo Organization',
          slug: 'demo-org',
          ownerId: user.id,
        },
      });
    }

    return user;
  }

  private async resolveOrganizationForUser(userId: string) {
    const ownedOrganization = await this.prisma.organization.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (ownedOrganization) {
      return ownedOrganization.id;
    }

    const membership = await this.prisma.membership.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (membership) {
      return membership.organizationId;
    }

    throw new UnauthorizedException('No organization found for user');
  }
}
