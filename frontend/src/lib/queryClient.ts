import { QueryClient, QueryFunction } from "@tanstack/react-query";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  withCredentials: false, // Temporarily disable credentials to test
});

console.log('API baseURL:', api.defaults.baseURL);

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
    console.log('Making API request:', method, url, data);
    const response = await api.request({
      method,
      url,
      data,
    });
    console.log('API response:', response.status, response.data);
    return response;
  } catch (error) {
    console.error('API request failed:', error);
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
