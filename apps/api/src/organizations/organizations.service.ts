import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class OrganizationsService implements OnModuleDestroy {
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

  async getEntitlementsForOrganization(organizationId: string) {
    return this.prisma.productEntitlement.findMany({
      where: { organizationId },
      include: {
        product: true,
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    await this.pool.end();
  }
}
