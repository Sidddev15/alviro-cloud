'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Entitlement = {
  id: string;
  status: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    description: string;
  };
  plan: {
    id: string;
    name: string;
    price: number;
    interval: string;
  };
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
const AUTH_TOKEN_KEY = 'accessToken';

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

function parseJwtPayload(token: string): { organizationId?: string } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );
    return JSON.parse(json) as { organizationId?: string };
  } catch {
    return null;
  }
}

export default function MyProductsPage() {
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadEntitlements() {
      try {
        setLoading(true);
        setError(null);

        const { token, organizationId } = await ensureSession();
        if (!organizationId) {
          throw new Error('No organization found for current user');
        }

        const response = await fetch(
          `${API_BASE_URL}/org/${organizationId}/entitlements`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to load entitlements (${response.status})`);
        }

        const data = (await response.json()) as Entitlement[];
        if (!ignore) {
          setEntitlements(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load products');
          setEntitlements([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadEntitlements();

    return () => {
      ignore = true;
    };
  }, []);

  async function ensureSession() {
    const existing = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (existing) {
      const payload = parseJwtPayload(existing);
      if (payload?.organizationId) {
        return { token: existing, organizationId: payload.organizationId };
      }
    }

    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo-owner@alviro.local',
        password: 'demo-password',
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed (${loginResponse.status})`);
    }

    const payload = (await loginResponse.json()) as {
      accessToken?: string;
      user?: { organizationId?: string };
    };

    if (!payload.accessToken || !payload.user?.organizationId) {
      throw new Error('Login response is missing access token or organization');
    }

    window.localStorage.setItem(AUTH_TOKEN_KEY, payload.accessToken);
    return {
      token: payload.accessToken,
      organizationId: payload.user.organizationId,
    };
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">My Products</h1>
        <p className="text-sm text-slate-600">
          Products currently active for your organization.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">Loading your products...</p>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : entitlements.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
          No active products yet. Browse marketplace to activate a plan.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {entitlements.map((item) => (
            <article
              key={item.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  {item.product.name}
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {item.status}
                </span>
              </div>

              <p className="mb-4 line-clamp-2 text-sm text-slate-600">
                {item.product.description}
              </p>

              <div className="space-y-1 text-sm text-slate-700">
                <p>
                  <span className="font-medium">Plan:</span> {item.plan.name}
                </p>
                <p>
                  <span className="font-medium">Pricing:</span>{' '}
                  {formatPrice(item.plan.price)} / {formatInterval(item.plan.interval)}
                </p>
              </div>

              <div className="mt-5">
                <Link
                  href={`/marketplace/${item.product.slug}`}
                  className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Launch
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
