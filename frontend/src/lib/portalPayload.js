export const PORTAL_PAYLOAD_VERSION = "openrti-portal-v1";

// Serialises a finished RTI draft into the JSON the browser extension fills
// into rtionline.gov.in. Only values the citizen has entered are included.
export function buildPortalPayload({
  department,
  authority,
  ministryId,
  authorityId,
  state,
  subject,
  body,
  applicant = {},
}) {
  return {
    version: PORTAL_PAYLOAD_VERSION,
    department: department || "",
    authority: authority || "",
    ministry_id: ministryId || "",
    authority_id: authorityId || "",
    state: state || "",
    subject: subject || "",
    description: body || "",
    applicant: {
      name: applicant.name || "",
      gender: applicant.gender || "",
      phone: applicant.phone || "",
      email: applicant.email || "",
      state: applicant.state || "",
      pincode: applicant.pincode || "",
      address: applicant.address || "",
    },
  };
}
