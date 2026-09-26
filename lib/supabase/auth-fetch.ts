import { supabaseBrowser } from "@/lib/supabase/client"

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession()

  if (!session?.access_token) {
    throw new Error("Authentication required")
  }

  const headers = new Headers(init.headers)

  headers.set(
    "Authorization",
    `Bearer ${session.access_token}`
  )

  return fetch(input, {
    ...init,
    headers,
  })
}
