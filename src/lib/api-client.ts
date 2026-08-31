// ─── Client-side API Fetch Helper ───────────────────────────────────────────────
// Used by Zustand stores to call the backend API routes.

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  details?: string[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

class ApiClientError extends Error {
  status: number
  details?: string[]

  constructor(message: string, status: number, details?: string[]) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.details = details
  }
}

export { ApiClientError }

async function handleResponse<T>(response: Response): Promise<T> {
  const json: ApiResponse<T> = await response.json()

  if (!response.ok || !json.success) {
    throw new ApiClientError(
      json.error || `Request failed with status ${response.status}`,
      response.status,
      json.details
    )
  }

  return json.data as T
}

async function handlePaginatedResponse<T>(response: Response): Promise<ApiResponse<T[]>> {
  const json: ApiResponse<T[]> = await response.json()

  if (!response.ok || !json.success) {
    throw new ApiClientError(
      json.error || `Request failed with status ${response.status}`,
      response.status,
      json.details
    )
  }

  return json
}

export const apiClient = {
  async get<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    })
    return handleResponse<T>(response)
  },

  async getPaginated<T>(url: string): Promise<ApiResponse<T[]>> {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    })
    return handlePaginatedResponse<T>(response)
  },

  async post<T>(url: string, body?: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    return handleResponse<T>(response)
  },

  async put<T>(url: string, body?: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    return handleResponse<T>(response)
  },

  async patch<T>(url: string, body?: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    return handleResponse<T>(response)
  },

  async delete<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
    })
    return handleResponse<T>(response)
  },
}
