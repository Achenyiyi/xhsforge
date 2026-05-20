"use client";

type ApiFetchOptions = RequestInit & {
  redirectOnUnauthorized?: boolean;
};

const PUBLIC_AUTH_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/terms",
]);

let unauthorizedRedirecting = false;

function isPublicAuthPath(pathname: string) {
  return PUBLIC_AUTH_PATHS.has(pathname);
}

function getSafeNextPath() {
  const { pathname, search } = window.location;

  if (isPublicAuthPath(pathname)) return "/";

  const next = `${pathname}${search}`;
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  if (next.length > 512) return "/";

  return next;
}

export async function apiFetch(input: RequestInfo | URL, init: ApiFetchOptions = {}) {
  const { redirectOnUnauthorized = true, ...requestInit } = init;
  const response = await fetch(input, requestInit);

  if (response.status === 401 && redirectOnUnauthorized && typeof window !== "undefined") {
    if (isPublicAuthPath(window.location.pathname) || unauthorizedRedirecting) {
      return response;
    }

    unauthorizedRedirecting = true;
    const next = getSafeNextPath();
    window.location.replace(`/login?expired=1&next=${encodeURIComponent(next)}`);
  }

  return response;
}
