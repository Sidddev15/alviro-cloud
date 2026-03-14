import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  UnauthorizedException,
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

  async checkout(input: { planId?: string; userId?: string }) {
    if (!input.planId) {
      throw new BadRequestException('planId is required');
    }

    if (!input.userId) {
      throw new UnauthorizedException('userId is required');
    }

    const plan = await this.prisma.productPlan.findUnique({
      where: { id: input.planId },
      select: { id: true, productId: true },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const organizationId = await this.resolveOrganizationForUser(input.userId);

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
      message: 'Checkout successful',
      entitlement,
    };
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    await this.pool.end();
  }

  private async resolveOrganizationForUser(userId: string) {
    const ownedOrg = await this.prisma.organization.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (ownedOrg) {
      return ownedOrg.id;
    }

    const membership = await this.prisma.membership.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (membership) {
      return membership.organizationId;
    }

    throw new NotFoundException('No organization found for this user');
  }
}
