import axios, { AxiosError, type AxiosInstance } from "axios";
import ms from "ms";

const REQUEST_TIMEOUT_MS = ms("15s");

export const createRelayHttpClient = (relayUrl: string): AxiosInstance =>
  axios.create({
    baseURL: relayUrl,
    timeout: REQUEST_TIMEOUT_MS,
  });

export const getApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (error instanceof AxiosError) {
    return error.response?.data?.error || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};
