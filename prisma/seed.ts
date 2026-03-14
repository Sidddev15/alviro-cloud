import {
  BillingInterval,
  PrismaClient,
  ProductStatus,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

type SeedProduct = {
  name: string;
  slug: string;
  description: string;
  status: ProductStatus;
  category: {
    name: string;
    slug: string;
  };
  plans: Array<{
    name: string;
    price: number;
    interval: BillingInterval;
  }>;
};

const products: SeedProduct[] = [
  {
    name: "Workforce",
    slug: "workforce",
    description: "People operations and workforce management platform.",
    status: ProductStatus.AVAILABLE,
    category: { name: "Operations", slug: "operations" },
    plans: [
      { name: "Starter", price: 2900, interval: BillingInterval.MONTHLY },
      { name: "Growth", price: 7900, interval: BillingInterval.MONTHLY },
      { name: "Enterprise", price: 19900, interval: BillingInterval.MONTHLY },
    ],
  },
  {
    name: "SalesOps",
    slug: "salesops",
    description: "Sales workflow automation and pipeline intelligence.",
    status: ProductStatus.BETA,
    category: { name: "Revenue", slug: "revenue" },
    plans: [
      { name: "Starter", price: 3900, interval: BillingInterval.MONTHLY },
      { name: "Growth", price: 9900, interval: BillingInterval.MONTHLY },
      { name: "Enterprise", price: 24900, interval: BillingInterval.MONTHLY },
    ],
  },
  {
    name: "Insight",
    slug: "insight",
    description: "Business analytics and reporting for cross-team decisions.",
    status: ProductStatus.COMING_SOON,
    category: { name: "Analytics", slug: "analytics" },
    plans: [
      { name: "Starter", price: 1900, interval: BillingInterval.MONTHLY },
      { name: "Growth", price: 5900, interval: BillingInterval.MONTHLY },
      { name: "Enterprise", price: 14900, interval: BillingInterval.MONTHLY },
    ],
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set.');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  for (const item of products) {
    const category = await prisma.productCategory.upsert({
      where: { slug: item.category.slug },
      update: { name: item.category.name },
      create: {
        name: item.category.name,
        slug: item.category.slug,
      },
    });

    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description,
        status: item.status,
        categoryId: category.id,
      },
      create: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        status: item.status,
        categoryId: category.id,
      },
    });

    for (const plan of item.plans) {
      const existingPlan = await prisma.productPlan.findFirst({
        where: {
          productId: product.id,
          name: plan.name,
        },
        select: { id: true },
      });

      if (existingPlan) {
        await prisma.productPlan.update({
          where: { id: existingPlan.id },
          data: {
            price: plan.price,
            interval: plan.interval,
          },
        });
      } else {
        await prisma.productPlan.create({
          data: {
            productId: product.id,
            name: plan.name,
            price: plan.price,
            interval: plan.interval,
          },
        });
      }
    }
  }

  console.log('Seed completed: products and plans are up to date.');

  await prisma.$disconnect();
  await pool.end();
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
