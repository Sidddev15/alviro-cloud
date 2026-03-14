'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ActivateButton({
  planId,
  productId,
  productSlug,
}: {
  planId: string;
  productId: string;
  productSlug: string;
}) {
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const router = useRouter();

  const storageKey = `active-plan:${productId}`;
  const persistedActivePlanId =
    typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
  const resolvedActivePlanId = activePlanId ?? persistedActivePlanId;
  const isActivated = resolvedActivePlanId === planId;

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

  function goToCheckout() {
    const params = new URLSearchParams({
      planId,
      productId,
      productSlug,
    });
    router.push(`/checkout?${params.toString()}`);
  }

  function handleActivate() {
    if (isActivated) return;

    if (resolvedActivePlanId && resolvedActivePlanId !== planId) {
      setShowConfirmModal(true);
      return;
    }

    goToCheckout();
  }

  function confirmPlanChange() {
    setShowConfirmModal(false);
    goToCheckout();
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={handleActivate}
        disabled={isActivated}
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:opacity-80"
      >
        {isActivated ? 'Activated' : 'Activate'}
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
    </div>
  );
}
