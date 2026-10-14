export const PORTAL_PAYLOAD_VERSION = "openrti-portal-v1";

// Serialises a finished RTI draft into the JSON the browser extension fills
// into rtionline.gov.in. Only values the citizen has entered are included.
export function buildPortalPayload({
  department,
  authority,
  state,
  subject,
  body,
  applicant = {},
}) {
  return {
    version: PORTAL_PAYLOAD_VERSION,
    department: department || "",
    authority: authority || "",
    state: state || "",
    subject: subject || "",
    description: body || "",
    applicant: {
      name: applicant.name || "",
      gender: applicant.gender || "",
      phone: applicant.phone || "",
      state: applicant.state || "",
      pincode: applicant.pincode || "",
      address: applicant.address || "",
    },
  };
}
