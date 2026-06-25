"""
Selectors for rtionline.gov.in — confirmed from live DOM probe.
"""

# ── Landing page URL ──────────────────────────────────────────────────────────
PORTAL_URL = "https://rtionline.gov.in/request/request_email_check.php?pageid=a87ff679a2f3e71d9181a67b7542122c"

# ── Landing page — Email + Mobile + CAPTCHA ───────────────────────────────────
LANDING_EMAIL         = "input[name='Email'], #Email"
LANDING_MOBILE        = "input[name='cell'], #cell"
LANDING_CAPTCHA_INPUT = "input[name='6_letters_code'], input[id='6_letters_code']"
LANDING_SUBMIT        = "input[name='Submit'], #Status, input[type='submit']"

# ── OTP page (Request_Check_Otp.php) ─────────────────────────────────────────
OTP_INPUT      = "input[name='otp'], input[id='otp']"
BTN_VERIFY_OTP = "input[id='Submit'], input[type='submit']"

# ── Main RTI form (request.php) — Public Authority ────────────────────────────
FIELD_MINISTRY    = "select[name='MinistryId']"
FIELD_DEPARTMENT  = "select[name='DepartmentId']"   # populated via AJAX after Ministry

# ── Main RTI form — Personal Details ─────────────────────────────────────────
FIELD_EMAIL         = "input[name='Email']"          # pre-filled from OTP step
FIELD_MOBILE        = "input[name='cell']"            # pre-filled from OTP step
FIELD_CONFIRM_EMAIL = "input[name='ConfirmEmail']"
FIELD_NAME          = "input[name='Name']"            # single full-name field
FIELD_ADDRESS1      = "input[name='address1']"
FIELD_ADDRESS2      = "input[name='address2']"
FIELD_ADDRESS3      = "input[name='address3']"
FIELD_PINCODE       = "input[name='pincode']"
FIELD_PHONE         = "input[name='phone']"    # optional landline/phone (separate from mobile)
FIELD_STATE         = "select[name='stateId']"

# Radios — use page.check(selector) or page.click(selector)
RADIO_GENDER_MALE    = "input[name='gender'][value='M']"
RADIO_GENDER_FEMALE  = "input[name='gender'][value='F']"
RADIO_GENDER_THIRD   = "input[name='gender'][value='T']"
RADIO_COUNTRY_INDIA  = "input[name='chkCountry'][value='001']"
RADIO_STATUS_URBAN   = "input[name='status'][value='U']"
RADIO_STATUS_RURAL   = "input[name='status'][value='R']"
RADIO_LITERATE       = "input[name='educational_Status'][value='L']"

# ── Main RTI form — Request Details ──────────────────────────────────────────
FIELD_CITIZENSHIP    = "select[name='Citizenship']"   # 'I' = Indian
FIELD_BPL            = "select[name='BPL']"           # 'N' = No, 'Y' = Yes
FIELD_DESCRIPTION    = "textarea[name='Description']" # RTI body text (max 3000 chars)

# ── Main RTI form — CAPTCHA + Submit ─────────────────────────────────────────
FORM_CAPTCHA_INPUT   = "input[name='6_letters_code'], input[id='6_letters_code']"
FORM_CAPTCHA_IMG     = "img[src*='captcha' i], img[src*='security' i], td img"
BTN_SUBMIT_FORM      = "input[name='requestSubmit'], input[id='requestSubmit']"

# ── Acknowledgment page ───────────────────────────────────────────────────────
ACK_NUMBER = "td:has-text('Registration'), td:has-text('RTIF'), strong, b"

# ── Ministry ID map (exact values from live dropdown) ────────────────────────
# key = AI-detected department string → value = MinistryId option value
MINISTRY_ID_MAP = {
    # Agriculture
    "Department of Agriculture":                           "12",
    "Ministry of Agriculture":                             "12",
    "Department of Agricultural Research":                 "13",
    "Department of Animal Husbandry":                      "14",

    # Atomic / Space / Science
    "Department of Atomic Energy":                         "23",
    "Department of Space":                                 "94",
    "Department of Science & Technology":                  "88",
    "Department of Bio-Technology":                        "90",
    "Ministry of Earth Sciences":                          "71",

    # Commerce / Industry
    "Department of Commerce":                              "24",
    "Department of Industrial Policy & Promotion":         "25",
    "Ministry of Heavy Industries":                        "51",
    "Ministry of Micro, Small and Medium Enterprises":     "2125",
    "Ministry of Mines":                                   "21",
    "Ministry of Steel":                                   "96",
    "Ministry of Textiles":                                "98",

    # Consumer / Food
    "Department of Consumer Affairs":                      "32",
    "Department of Food & Public Distribution":            "31",
    "Ministry of Food Processing Industries":              "15",
    "Food Safety & Standards Authority":                   "3179",

    # Defence
    "Department of Defence":                               "34",
    "Ministry of Defence":                                 "34",
    "Department of Defence Production":                    "35",

    # Education
    "Ministry of Education":                               "59",
    "Department of Higher Education":                      "61",
    "Department of School Education":                      "60",

    # Electronics / Telecom
    "Ministry of Electronics & Information Technology":    "29",
    "Department of Telecommunications":                    "27",

    # Environment
    "Ministry of Environment, Forest and Climate Change":  "39",

    # External Affairs
    "Ministry of External Affairs":                        "40",

    # Finance
    "Department of Economic Affairs":                      "42",
    "Department of Expenditure":                           "43",
    "Department of Revenue":                               "44",
    "Ministry of Finance":                                 "42",
    "Department of Financial Services":                    "1738",
    "Department of Investment":                            "37",

    # Health
    "Department of Health & Family Welfare":               "47",
    "Ministry of Health":                                  "47",
    "Department of Health Research":                       "2551",
    "Ministry of AYUSH":                                   "48",
    "Department of Pharmaceuticals":                       "2044",

    # Home / Law
    "Ministry of Home Affairs":                            "53",
    "Department of Justice":                               "68",
    "Department of Legal Affairs":                         "66",
    "Legislative Department":                              "67",

    # Housing / Urban
    "Ministry of Housing & Urban Affairs":                 "103",
    "Ministry of Urban Development":                       "103",

    # Labour
    "Ministry of Labour & Employment":                     "64",

    # Petroleum / Power / Energy
    "Ministry of Petroleum & Natural Gas":                 "78",
    "Ministry of Power":                                   "80",
    "Ministry of New & Renewable Energy":                  "70",
    "Ministry of Coal":                                    "19",

    # Personnel / Pensions / Administration
    "Department of Personnel & Training":                  "75",
    "Department of Administrative Reforms":                "76",
    "Department of Pensions":                              "77",
    "Cabinet Secretariat":                                 "8",

    # PMO
    "Prime Minister's Office":                             "72",
    "PMO":                                                 "72",
    "NITI Aayog":                                          "79",

    # Posts
    "Department of Posts":                                 "28",

    # Railways / Transport
    "Ministry of Railways":                                "81",
    "Ministry of Road Transport & Highways":               "104",
    "Ministry of Ports, Shipping and Waterways":           "97",
    "Ministry of Civil Aviation":                          "18",

    # Rural / Water / Land
    "Ministry of Rural Development":                       "83",
    "Ministry of Drinking Water and Sanitation":           "86",
    "Ministry of Water Resources":                         "106",
    "Ministry of Panchayati Raj":                          "49",
    "Department of Land Resources":                        "85",

    # Social
    "Ministry of Social Justice & Empowerment":            "93",
    "Ministry of Women & Child Development":               "62",
    "Ministry of Minority Affairs":                        "20",
    "Ministry of Tribal Affairs":                          "102",

    # Statistics / Culture / Tourism / Youth
    "Ministry of Statistics":                              "95",
    "Ministry of Culture":                                 "101",
    "Ministry of Tourism":                                 "100",
    "Ministry of Youth Affairs & Sports":                  "107",
    "Ministry of Information & Broadcasting":              "63",

    # Skill / Cooperation
    "Ministry of Skill Development":                       "3015",
    "Ministry of Cooperation":                             "3931",
    "Ministry of Corporate Affairs":                       "69",
    "Ministry of Parliamentary Affairs":                   "73",

    # North East
    "Ministry of Development of North Eastern Region":     "38",
}

# ── State code map ────────────────────────────────────────────────────────────
STATE_CODE_MAP = {
    "Andhra Pradesh":        "AP",
    "Arunachal Pradesh":     "AR",
    "Assam":                 "AS",
    "Bihar":                 "BH",
    "Chandigarh":            "CH",
    "Chhattisgarh":          "CG",
    "Chattisgarh":           "CG",
    "Delhi":                 "DH",
    "Goa":                   "GD",
    "Gujarat":               "GJ",
    "Haryana":               "HY",
    "Himachal Pradesh":      "HP",
    "Jammu and Kashmir":     "JK",
    "Jammu & Kashmir":       "JK",
    "Jharkhand":             "JH",
    "Karnataka":             "KN",
    "Kerala":                "KL",
    "Lakshadweep":           "LD",
    "Madhya Pradesh":        "MP",
    "Maharashtra":           "MH",
    "Manipur":               "MN",
    "Meghalaya":             "MG",
    "Mizoram":               "MZ",
    "Nagaland":              "NL",
    "Odisha":                "OR",
    "Puducherry":            "PC",
    "Punjab":                "PB",
    "Rajasthan":             "RJ",
    "Sikkim":                "SK",
    "Tamil Nadu":            "TN",
    "Tamilnadu":             "TN",
    "Telangana":             "TG",
    "Tripura":               "TR",
    "Uttarakhand":                                    "UC",
    "Uttar Pradesh":                                  "UP",
    "West Bengal":                                    "WB",
    "Andaman and Nicobar Islands":                    "UT",
    "Dadra and Nagar Haveli and Daman and Diu":       "UT",
    "Ladakh":                                         "UT",
    "Central Government":                             "XX",   # No State
}
