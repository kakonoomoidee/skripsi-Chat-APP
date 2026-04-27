import { AxiosError } from "axios";
import { createRelayHttpClient } from "@/services/api/httpClient";

interface AuthUserResponse {
  username: string;
}

interface AuthAddressResponse {
  address: string;
}

export const checkUsernameAvailability = async (
  relayUrl: string,
  username: string,
): Promise<boolean> => {
  const encodedUsername = encodeURIComponent(username.trim());

  try {
    await createRelayHttpClient(relayUrl).get(
      `/auth/address/${encodedUsername}`,
    );
    return false;
  } catch (error: unknown) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return true;
    }

    throw error;
  }
};

export const getUsernameByAddress = async (
  relayUrl: string,
  address: string,
): Promise<string> => {
  const encodedAddress = encodeURIComponent(address.trim());
  const response = await createRelayHttpClient(relayUrl).get<AuthUserResponse>(
    `/auth/user/${encodedAddress}`,
  );

  return response.data.username;
};

export const getAddressByUsername = async (
  relayUrl: string,
  username: string,
): Promise<string> => {
  const encodedUsername = encodeURIComponent(username.trim());
  const response = await createRelayHttpClient(
    relayUrl,
  ).get<AuthAddressResponse>(`/auth/address/${encodedUsername}`);

  return response.data.address;
};
