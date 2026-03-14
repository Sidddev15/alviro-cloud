'use client';

import { useEffect, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export default function ActivateButton({
  planId,
  productId,
}: {
  planId: string;
  productId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const storageKey = `active-plan:${productId}`;
  const isActivated = activePlanId === planId;

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      setActivePlanId(saved);
    }
  }, [planId, storageKey]);

  useEffect(() => {
    if (!message) return;

    const timer = window.setTimeout(() => {
      setMessage(null);
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [message]);

  useEffect(() => {
    function handlePlanChanged(event: Event) {
      const customEvent = event as CustomEvent<{
        productId: string;
        planId: string;
      }>;

      if (customEvent.detail?.productId === productId) {
        setActivePlanId(customEvent.detail.planId);
      }
    }

    window.addEventListener(
      'plan-activation-changed',
      handlePlanChanged as EventListener,
    );

    return () => {
      window.removeEventListener(
        'plan-activation-changed',
        handlePlanChanged as EventListener,
      );
    };
  }, [productId]);

  async function activateSelectedPlan() {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const response = await fetch(`${API_BASE_URL}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        throw new Error(`Checkout failed (${response.status})`);
      }

      setActivePlanId(planId);
      window.localStorage.setItem(storageKey, planId);
      window.dispatchEvent(
        new CustomEvent('plan-activation-changed', {
          detail: { productId, planId },
        }),
      );
      setMessage('Activated successfully');
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  }

  function handleActivate() {
    if (isActivated || loading) return;

    if (activePlanId && activePlanId !== planId) {
      setShowConfirmModal(true);
      return;
    }

    void activateSelectedPlan();
  }

  function confirmPlanChange() {
    setShowConfirmModal(false);
    void activateSelectedPlan();
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={handleActivate}
        disabled={loading || isActivated}
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:opacity-80"
      >
        {isActivated ? 'Activated' : loading ? 'Activating...' : 'Activate'}
      </button>

      {showConfirmModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <p className="text-sm font-medium text-slate-900">
              Do you want to change your plan?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPlanChange}
                className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-700"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="fixed bottom-4 right-4 z-[60] rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="fixed bottom-4 right-4 z-[60] rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {error}
        </div>
      ) : null}
    </div>
  );
}
