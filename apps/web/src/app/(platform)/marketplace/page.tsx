'use client';

import { useEffect, useMemo, useState } from 'react';

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadProducts() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/products`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as Product[];
        if (!ignore) {
          setProducts(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!ignore) {
          const message =
            err instanceof Error ? err.message : 'Failed to fetch products.';
          setError(message);
          setProducts([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      ignore = true;
    };
  }, []);

  const categories = useMemo(() => {
    const values = new Set(
      products.map((product) => product.category?.name ?? 'Uncategorized'),
    );
    return ['All', ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const searchText = query.trim().toLowerCase();

    return products.filter((product) => {
      const categoryName = product.category?.name ?? 'Uncategorized';
      const matchesCategory =
        selectedCategory === 'All' || categoryName === selectedCategory;
      const matchesQuery =
        searchText.length === 0 ||
        product.name.toLowerCase().includes(searchText) ||
        product.description.toLowerCase().includes(searchText);

      return matchesCategory && matchesQuery;
    });
  }, [products, query, selectedCategory]);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Marketplace</h1>
        <p className="text-sm text-slate-600">
          Browse available products and discover plans for your organization.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search products..."
          className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
        />

        <select
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-900"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading products...</p>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load products: {error}
        </div>
      ) : filteredProducts.length === 0 ? (
        <p className="text-sm text-slate-500">
          No products match your current search/filter.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <article
              key={product.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  {product.name}
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {product.status}
                </span>
              </div>

              <p className="mb-4 line-clamp-3 text-sm text-slate-600">
                {product.description}
              </p>

              <div className="text-xs text-slate-500">
                Category: {product.category?.name ?? 'Uncategorized'}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
