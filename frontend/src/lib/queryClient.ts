import { QueryClient, QueryFunction } from "@tanstack/react-query";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : "http://localhost:8000",
  withCredentials: true,
});

async function throwIfResNotOk(error: any) {
  if (error.response) {
    const message = error.response.data?.message || error.response.statusText;
    throw new Error(`${error.response.status}: ${message}`);
  }
  throw error;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  try {
    const config: any = {
      method,
      url,
    };

    if (data instanceof FormData) {
      // For FormData, let axios handle the Content-Type automatically
      config.data = data;
      // Don't set Content-Type header - axios will set it with boundary
    } else if (data !== undefined) {
      // For regular data, send as JSON
      config.data = data;
      config.headers = {
        'Content-Type': 'application/json',
      };
    }

    const response = await api.request(config);
    return response;
  } catch (error) {
    await throwIfResNotOk(error);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const response = await api.get(queryKey.join("/") as string);
      return response.data;
    } catch (error: any) {
      if (unauthorizedBehavior === "returnNull" && error.response?.status === 401) {
        return null;
      }
      await throwIfResNotOk(error);
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
