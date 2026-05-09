"use client";

type ApiFetchOptions = RequestInit & {
  redirectOnUnauthorized?: boolean;
};

export async function apiFetch(input: RequestInfo | URL, init: ApiFetchOptions = {}) {
  const { redirectOnUnauthorized = true, ...requestInit } = init;
  const response = await fetch(input, requestInit);

  if (response.status === 401 && redirectOnUnauthorized && typeof window !== "undefined") {
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/login?expired=1&next=${encodeURIComponent(next)}`;
  }

  return response;
}
