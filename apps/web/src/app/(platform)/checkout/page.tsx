'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

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
  plans: ProductPlan[];
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

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const planId = searchParams.get('planId');
  const productId = searchParams.get('productId');
  const productSlug = searchParams.get('productSlug');

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadCheckoutData() {
      if (!planId || !productSlug) {
        setError('Missing checkout details. Please select a plan again.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/products/${productSlug}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Failed to load checkout details (${response.status})`);
        }

        const data = (await response.json()) as ProductDetail;

        if (!ignore) {
          setProduct(data);
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err instanceof Error ? err.message : 'Failed to load checkout details',
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadCheckoutData();

    return () => {
      ignore = true;
    };
  }, [planId, productSlug]);

  const selectedPlan = useMemo(
    () => product?.plans.find((plan) => plan.id === planId) ?? null,
    [product, planId],
  );

  async function ensureAccessToken() {
    const existing = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (existing) {
      return existing;
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

    const payload = (await loginResponse.json()) as { accessToken?: string };
    if (!payload.accessToken) {
      throw new Error('Login did not return an access token');
    }

    window.localStorage.setItem(AUTH_TOKEN_KEY, payload.accessToken);
    return payload.accessToken;
  }

  async function handleConfirmCheckout() {
    if (!planId || !productId || !productSlug) {
      setError('Missing checkout details.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const token = await ensureAccessToken();

      const response = await fetch(`${API_BASE_URL}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        throw new Error(`Checkout failed (${response.status})`);
      }

      const storageKey = `active-plan:${productId}`;
      window.localStorage.setItem(storageKey, planId);
      window.dispatchEvent(
        new CustomEvent('plan-activation-changed', {
          detail: { productId, planId },
        }),
      );

      setSuccessToast(true);
      window.setTimeout(() => {
        router.push(`/marketplace/${productSlug}`);
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Checkout</h1>
        <p className="text-sm text-slate-600">
          Confirm your plan to activate it for your organization.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">Loading checkout details...</p>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : !product || !selectedPlan ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Invalid checkout session. Please choose a plan again from marketplace.
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Product</p>
            <p className="text-base font-semibold text-slate-900">{product.name}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Plan</p>
            <p className="text-base font-semibold text-slate-900">{selectedPlan.name}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Pricing</p>
            <p className="text-base font-semibold text-slate-900">
              {formatPrice(selectedPlan.price)} / {formatInterval(selectedPlan.interval)}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Link
              href={`/marketplace/${productSlug}`}
              className="inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleConfirmCheckout}
              disabled={submitting}
              className="inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Processing...' : 'Confirm Checkout'}
            </button>
          </div>
        </div>
      )}

      {successToast ? (
        <div className="fixed bottom-4 right-4 z-[60] rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          Activated successfully
        </div>
      ) : null}
    </section>
  );
}
