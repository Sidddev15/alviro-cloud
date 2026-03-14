import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { EntitlementStatus, PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class BillingService implements OnModuleDestroy {
  private readonly pool: Pool;
  private readonly prisma: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }

    this.pool = new Pool({ connectionString });
    const adapter = new PrismaPg(this.pool);
    this.prisma = new PrismaClient({ adapter });
  }

  async checkout(input: { planId?: string; organizationId?: string }) {
    if (!input.planId) {
      throw new BadRequestException('planId is required');
    }

    const plan = await this.prisma.productPlan.findUnique({
      where: { id: input.planId },
      select: { id: true, productId: true },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const organizationId = input.organizationId
      ? await this.ensureOrganizationExists(input.organizationId)
      : await this.ensureDemoOrganization();

    const existing = await this.prisma.productEntitlement.findFirst({
      where: {
        organizationId,
        productId: plan.productId,
        planId: plan.id,
      },
      select: { id: true },
    });

    const entitlement = existing
      ? await this.prisma.productEntitlement.update({
          where: { id: existing.id },
          data: { status: EntitlementStatus.ACTIVE },
          include: {
            product: true,
            plan: true,
            organization: true,
          },
        })
      : await this.prisma.productEntitlement.create({
          data: {
            organizationId,
            productId: plan.productId,
            planId: plan.id,
            status: EntitlementStatus.ACTIVE,
          },
          include: {
            product: true,
            plan: true,
            organization: true,
          },
        });

    return {
      message: 'Mock checkout successful',
      entitlement,
    };
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    await this.pool.end();
  }

  private async ensureOrganizationExists(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org.id;
  }

  private async ensureDemoOrganization() {
    const existing = await this.prisma.organization.findUnique({
      where: { slug: 'demo-org' },
      select: { id: true },
    });

    if (existing) {
      return existing.id;
    }

    const owner = await this.prisma.user.upsert({
      where: { email: 'demo-owner@alviro.local' },
      update: {},
      create: {
        email: 'demo-owner@alviro.local',
        password: 'demo-password',
        firstName: 'Demo',
        lastName: 'Owner',
      },
      select: { id: true },
    });

    const org = await this.prisma.organization.create({
      data: {
        lastName: 'Demo Organization',
        slug: 'demo-org',
        ownerId: owner.id,
      },
      select: { id: true },
    });

    return org.id;
  }
}
