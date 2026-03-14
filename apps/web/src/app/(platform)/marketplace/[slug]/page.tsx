import Link from 'next/link';
import { notFound } from 'next/navigation';
import ActivateButton from './activate-button';

type ProductPlan = {
  id: string;
  name: string;
  price: number;
  interval: 'MONTHLY' | 'YEARLY' | 'ONE_TIME' | string;
};

type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  features: string[];
  plans: ProductPlan[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatInterval(interval: string) {
  if (interval === 'ONE_TIME') return 'one-time';
  return interval.toLowerCase();
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const response = await fetch(`${API_BASE_URL}/products/${slug}`, {
    cache: 'no-store',
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(`Failed to load product details (${response.status})`);
  }

  const product = (await response.json()) as ProductDetail;

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/marketplace"
          className="inline-flex text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to marketplace
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold text-slate-900">{product.name}</h1>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            {product.status}
          </span>
        </div>

        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          {product.description}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Features</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          {product.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Plans & Pricing</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {product.plans.map((plan) => (
            <article
              key={plan.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-base font-semibold text-slate-900">{plan.name}</h3>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatPrice(plan.price)}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                {formatInterval(plan.interval)}
              </p>
              <ActivateButton
                planId={plan.id}
                productId={product.id}
                productSlug={product.slug}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
