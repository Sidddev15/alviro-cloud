'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Entitlement = {
  id: string;
  status: string;
  product: {
    slug: string;
    name: string;
  };
  plan: {
    name: string;
  };
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
const AUTH_TOKEN_KEY = 'accessToken';

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

export default function ProductLauncherGuard({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [entitledPlan, setEntitledPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function checkEntitlement() {
      try {
        setLoading(true);
        setError(null);

        const { token, organizationId } = await ensureSession();

        const response = await fetch(
          `${API_BASE_URL}/org/${organizationId}/entitlements`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to load entitlements (${response.status})`);
        }

        const entitlements = (await response.json()) as Entitlement[];
        const active = entitlements.find(
          (item) =>
            item.product.slug === slug && item.status.toUpperCase() === 'ACTIVE',
        );

        if (!active) {
          router.replace('/marketplace');
          return;
        }

        if (!ignore) {
          setEntitledPlan(active.plan.name);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to validate access');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void checkEntitlement();

    return () => {
      ignore = true;
    };
  }, [router, slug]);

  if (loading) {
    return <p className="text-sm text-slate-500">Checking access...</p>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="text-sm text-slate-600">
        Access granted. Active plan: <span className="font-medium">{entitledPlan}</span>
      </p>
    </section>
  );
}
