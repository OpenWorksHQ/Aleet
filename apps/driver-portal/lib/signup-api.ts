const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface VehicleType {
  _id: string;
  name: string;
  description: string;
  hourlyPrice: number;
}

export async function fetchVehicleTypes(): Promise<VehicleType[]> {
  const res = await fetch(`${BASE_URL}/api/vehicle-types`, {
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.success === false) return [];
  return (json.data ?? json) as VehicleType[];
}

/**
 * POST /api/auth/driver/signup/start
 * Validates basic info and returns a short-lived driverToken
 * (type: driver_signup_verified, 30 min). Driver verification happens
 * via document review + Checkr background check, not SMS/OTP.
 */
export async function signupStart(body: {
  name: string;
  phone: string;
  email: string;
  password: string;
}): Promise<{ driverToken: string }> {
  const res = await fetch(`${BASE_URL}/api/auth/driver/signup/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Signup failed");
  }
  return json.data as { driverToken: string };
}

/** POST /api/auth/driver/signup/documents */
export async function signupDocuments(data: {
  driverToken: string;
  hasForHireLicense: boolean;
  hasOwnVehicle: boolean;
  licenseImage: File;
  ssn?: string;
  vehicleTypes?: string[];
  vehicleImage?: File | null;
  forHireLicenseImage?: File | null;
}): Promise<string> {
  const form = new FormData();
  form.append("driverToken", data.driverToken);
  form.append("hasForHireLicense", String(data.hasForHireLicense));
  form.append("hasOwnVehicle", String(data.hasOwnVehicle));
  form.append("licenseImage", data.licenseImage);
  if (data.ssn) form.append("ssn", data.ssn);
  if (data.vehicleTypes)
    data.vehicleTypes.forEach((id) => form.append("vehicleTypes", id));
  if (data.vehicleImage) form.append("vehicleImage", data.vehicleImage);
  if (data.forHireLicenseImage)
    form.append("forHireLicenseImage", data.forHireLicenseImage);

  const res = await fetch(`${BASE_URL}/api/auth/driver/signup/documents`, {
    method: "POST",
    body: form,
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to upload documents");
  }
  return json.data.docsToken as string;
}

/** POST /api/auth/driver/signup/complete */
export async function signupComplete(data: {
  docsToken: string;
  authorizeBackgroundCheck: boolean;
}): Promise<{
  token: string;
  user: { role: string; driver?: { status: string } };
}> {
  const form = new FormData();
  form.append("docsToken", data.docsToken);
  form.append(
    "authorizeBackgroundCheck",
    String(data.authorizeBackgroundCheck),
  );

  const res = await fetch(`${BASE_URL}/api/auth/driver/signup/complete`, {
    method: "POST",
    body: form,
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to create account");
  }
  return json.data as {
    token: string;
    user: { role: string; driver?: { status: string } };
  };
}
