import { createRelayHttpClient } from "@/services/api/httpClient";

export interface AuthResponse {
  token?: string;
  [key: string]: unknown;
}

export interface AuthChallengeResponse {
  nonce: string;
}

export interface AuthLoginResponse {
  token: string;
}

interface RegisterPayload {
  userAddress: string;
  username: string;
  publicKey: string;
  signature: string;
}

interface LoginPayload {
  address: string;
  signature: string;
}

export const registerIdentity = async (
  relayUrl: string,
  payload: RegisterPayload,
): Promise<AuthResponse> => {
  const response = await createRelayHttpClient(relayUrl).post<AuthResponse>(
    "/auth/register",
    payload,
  );

  return response.data;
};

export const requestAuthChallenge = async (
  relayUrl: string,
  address: string,
): Promise<AuthChallengeResponse> => {
  const response = await createRelayHttpClient(
    relayUrl,
  ).post<AuthChallengeResponse>("/auth/challenge", { address });

  return response.data;
};

export const loginWithSignature = async (
  relayUrl: string,
  payload: LoginPayload,
): Promise<AuthLoginResponse> => {
  const response = await createRelayHttpClient(
    relayUrl,
  ).post<AuthLoginResponse>("/auth/login", payload);

  return response.data;
};
