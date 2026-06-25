"""
Selectors for rtionline.delhi.gov.in (Delhi State RTI portal).

The Delhi portal runs the same NIC "RTI Online" software as the central
rtionline.gov.in, so most field NAMES are shared. The important differences:

  1. CAPTCHA is client-side. captcha.php injects the answer into a readonly
     input #capVal (only visually obscured via CSS invert + bg image). We can
     read document.getElementById('capVal').value straight from the DOM and
     copy it into #6_letters_code — NO image OCR / Gemini needed.

  2. PUBLIC AUTHORITY is a single-level dropdown select[name='MinistryId']
     (221 Delhi departments). There is NO Ministry -> Department AJAX layer
     like the central portal. The authority list lives in delhi_authorities.json
     (scraped from the public pio_app_details.php page).

Landing-page selectors below are CONFIRMED from the live DOM.
request.php (main form) selectors are NIC-standard (same as central); the
autofill script verifies them live via dump_inputs() / --probe and falls back
to manual entry on any mismatch.
"""

# ── Landing page URL ──────────────────────────────────────────────────────────
PORTAL_URL = "https://rtionline.delhi.gov.in/request/request_email_check.php?lan=E"

# ── Landing page — Email + Mobile + client-side CAPTCHA ───────────────────────
LANDING_EMAIL         = "input[name='Email'], #Email"
LANDING_MOBILE        = "input[name='cell'], #cell"
LANDING_CAPTCHA_INPUT = "input[name='6_letters_code'], #6_letters_code"
LANDING_CAPTCHA_VALUE = "input[name='div_captcha'], #capVal"   # readonly — holds the answer
LANDING_SUBMIT        = "input[name='Submit'], #Submit, input[type='submit']"

# ── OTP page (if the portal sends an email OTP after the landing page) ─────────
OTP_INPUT      = "input[name='otp'], input[id='otp']"
BTN_VERIFY_OTP = "input[id='Submit'], input[name='Submit'], input[type='submit']"

# ── Main RTI form (request.php) — Public Authority (single level) ─────────────
FIELD_AUTHORITY   = "select[name='MinistryId'], #MinistryId"
# Some NIC builds expose an extra office sub-select; harmless if absent.
FIELD_DEPARTMENT  = "select[name='DepartmentId'], #DepartmentId"

# ── Main RTI form — Personal Details (NIC-standard names) ─────────────────────
FIELD_EMAIL         = "input[name='Email']"          # pre-filled from landing/OTP
FIELD_MOBILE        = "input[name='cell']"           # pre-filled from landing/OTP
FIELD_CONFIRM_EMAIL = "input[name='ConfirmEmail']"
FIELD_NAME          = "input[name='Name']"           # single full-name field
FIELD_ADDRESS1      = "input[name='address1']"
FIELD_ADDRESS2      = "input[name='address2']"
FIELD_ADDRESS3      = "input[name='address3']"
FIELD_PINCODE       = "input[name='pincode']"
FIELD_PHONE         = "input[name='phone']"          # optional landline
FIELD_STATE         = "select[name='stateId']"

# Radios — page.check(selector)
RADIO_GENDER_MALE    = "input[name='gender'][value='M']"
RADIO_GENDER_FEMALE  = "input[name='gender'][value='F']"
RADIO_GENDER_THIRD   = "input[name='gender'][value='T']"
RADIO_COUNTRY_INDIA  = "input[name='chkCountry'][value='001']"
RADIO_STATUS_URBAN   = "input[name='status'][value='U']"
RADIO_STATUS_RURAL   = "input[name='status'][value='R']"
RADIO_LITERATE       = "input[name='educational_Status'][value='L']"

# ── Main RTI form — Request Details ──────────────────────────────────────────
FIELD_CITIZENSHIP    = "select[name='Citizenship']"  # 'I' = Indian
FIELD_BPL            = "select[name='BPL']"           # 'N' = No, 'Y' = Yes
FIELD_DESCRIPTION    = "textarea[name='Description']" # RTI body text (max 3000 chars)

# ── Main RTI form — CAPTCHA (also client-side) + Submit ───────────────────────
FORM_CAPTCHA_INPUT   = "input[name='6_letters_code'], #6_letters_code"
FORM_CAPTCHA_VALUE   = "input[name='div_captcha'], #capVal"   # readonly — holds the answer
BTN_SUBMIT_FORM      = "input[name='requestSubmit'], #requestSubmit, input[type='submit']"

# ── Acknowledgment page ───────────────────────────────────────────────────────
ACK_NUMBER = "td:has-text('Registration'), td:has-text('RTI'), strong, b"

# ── Delhi applicant-state dropdown — NIC 2-letter codes (same family as central)
# Used only for the APPLICANT's home state on the personal-details section.
# The script selects by fuzzy label match too, so exact codes are non-critical.
STATE_CODE_MAP = {
    "Andhra Pradesh": "AP", "Arunachal Pradesh": "AR", "Assam": "AS",
    "Bihar": "BH", "Chandigarh": "CH", "Chhattisgarh": "CG", "Chattisgarh": "CG",
    "Delhi": "DH", "Goa": "GD", "Gujarat": "GJ", "Haryana": "HY",
    "Himachal Pradesh": "HP", "Jammu and Kashmir": "JK", "Jammu & Kashmir": "JK",
    "Jharkhand": "JH", "Karnataka": "KN", "Kerala": "KL", "Lakshadweep": "LD",
    "Madhya Pradesh": "MP", "Maharashtra": "MH", "Manipur": "MN", "Meghalaya": "MG",
    "Mizoram": "MZ", "Nagaland": "NL", "Odisha": "OR", "Puducherry": "PC",
    "Punjab": "PB", "Rajasthan": "RJ", "Sikkim": "SK", "Tamil Nadu": "TN",
    "Tamilnadu": "TN", "Telangana": "TG", "Tripura": "TR", "Uttarakhand": "UC",
    "Uttar Pradesh": "UP", "West Bengal": "WB",
    "Andaman and Nicobar Islands": "UT",
    "Dadra and Nagar Haveli and Daman and Diu": "UT", "Ladakh": "UT",
}
