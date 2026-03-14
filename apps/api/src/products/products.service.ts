import { Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class ProductsService implements OnModuleDestroy {
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

  async findAll() {
    const products = await this.prisma.product.findMany({
      include: {
        category: true,
        plans: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return products.map((product) => ({
      ...product,
      features: this.getFeatures(product.slug),
    }));
  }

  async findOneBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        plans: {
          orderBy: {
            price: 'asc',
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product not found for slug: ${slug}`);
    }

    return {
      ...product,
      features: this.getFeatures(product.slug),
    };
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    await this.pool.end();
  }

  private getFeatures(slug: string): string[] {
    const featureMap: Record<string, string[]> = {
      workforce: [
        'Shift and attendance tracking',
        'Leave and policy automation',
        'Role-based team workspaces',
      ],
      salesops: [
        'Pipeline stage automation',
        'Lead routing and qualification',
        'Revenue and conversion dashboards',
      ],
      insight: [
        'Cross-product KPI dashboards',
        'Scheduled stakeholder reports',
        'Cohort and trend analysis',
      ],
    };

    return (
      featureMap[slug] ?? [
        'Core workspace management',
        'Secure multi-tenant access',
        'Operational analytics',
      ]
    );
  }
}
