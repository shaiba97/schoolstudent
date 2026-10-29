const API_URL = process.env.STUDENT_API_URL || "https://schoolbackend-7n8a.onrender.com/api";

export const STUDENT_AUTH_HEADER = "authorization";
export const STUDENT_TENANT_HEADER = "x-tenant-id";
/** Session cookie names (populated by the login slice; auth comes last). */
export const STUDENT_TOKEN_COOKIE = "sp_token";
export const STUDENT_TENANT_COOKIE = "sp_tenant";

export class StudentSessionError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StudentSessionError";
    this.status = status;
  }
}

/** Dev bypass mirroring the backend's AUTH_NO_SESSION: unauthenticated local work. */
const NO_SESSION = process.env.STUDENT_NO_AUTH === "true";

export function studentRequestHeaders(source: Headers) {
  const authorization = source.get(STUDENT_AUTH_HEADER);
  const tenantId = source.get(STUDENT_TENANT_HEADER);

  if (NO_SESSION) {
    return {
      authorization: authorization || "",
      tenantId: tenantId || process.env.NEXT_PUBLIC_TENANT_ID || "",
    };
  }
  if (!authorization) throw new StudentSessionError("Student session is missing", 401);
  if (!tenantId) throw new StudentSessionError("Student tenant is missing", 403);
  return { authorization, tenantId };
}

/**
 * Cookie-first resolution for the browser proxy: the login slice stores the
 * JWT + tenant in httpOnly cookies (invisible to JS), so the proxy route
 * reads them here and forwards them as headers. Direct headers still win
 * when present (server-to-server calls, dev tools).
 */
export async function getProxySession(request: Request) {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const headerAuth = request.headers.get(STUDENT_AUTH_HEADER);
  const headerTenant = request.headers.get(STUDENT_TENANT_HEADER);
  const authorization =
    headerAuth || (jar.get(STUDENT_TOKEN_COOKIE)?.value ? `Bearer ${jar.get(STUDENT_TOKEN_COOKIE)?.value}` : "");
  const tenantId = headerTenant || jar.get(STUDENT_TENANT_COOKIE)?.value || "";
  return studentRequestHeaders(
    new Headers({
      ...(authorization ? { [STUDENT_AUTH_HEADER]: authorization } : {}),
      ...(tenantId ? { [STUDENT_TENANT_HEADER]: tenantId } : {}),
    }),
  );
}

export async function getIncomingStudentHeaders() {
  const { headers } = await import("next/headers");
  return studentRequestHeaders(await headers());
}

export function studentApiUrl(path: string) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
