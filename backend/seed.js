/**
 * seed.js — Insert 10 realistic Hindi RTI entries for development/testing
 *
 * Usage:
 *   cd backend && node seed.js
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 768-dimensional zero vector (placeholder — real embeddings need Gemini)
const ZERO_EMBEDDING = new Array(768).fill(0);

const seedData = [
  // 1. PWD सड़क निर्माण — Maharashtra
  {
    title: "महाराष्ट्र PWD सड़क निर्माण में अनियमितताएं",
    department: "लोक निर्माण विभाग (PWD)",
    ministry: "सार्वजनिक निर्माण मंत्रालय",
    state: "Maharashtra",
    district: "पुणे",
    area: "हडपसर",
    subject:
      "हडपसर क्षेत्र में PWD द्वारा कराए गए सड़क निर्माण कार्यों में अनियमितताओं की जानकारी मांगी जा रही है।",
    questions: [
      "वर्ष 2022-23 में हडपसर क्षेत्र में कितने सड़क निर्माण कार्य PWD द्वारा कराए गए और उनकी कुल लागत कितनी थी?",
      "इन कार्यों के लिए किन ठेकेदारों को निविदा दी गई और उनका चयन किस प्रक्रिया से हुआ?",
      "क्या इन कार्यों की तृतीय पक्ष गुणवत्ता जांच कराई गई? यदि हां, तो उसकी रिपोर्ट उपलब्ध कराएं।",
    ],
    response_summary:
      "विभाग ने 12 सड़क निर्माण कार्यों की जानकारी दी, परंतु ठेकेदार चयन प्रक्रिया की जानकारी देने से मना कर दिया।",
    response_status: "partial",
    date_filed: "2023-03-15",
    date_of_response: "2023-06-10",
    rti_act_sections: ["धारा 6", "धारा 7", "धारा 8(1)(d)"],
    tags: ["सड़क", "PWD", "निर्माण", "भ्रष्टाचार", "Maharashtra"],
    language: "hindi",
    is_anonymous: false,
    filer_name: "राजेश कुमार वर्मा",
    upvotes: 12,
    view_count: 89,
    extracted_text:
      "यह RTI आवेदन हडपसर क्षेत्र में PWD द्वारा किए गए सड़क निर्माण कार्यों की जानकारी हेतु है...",
    embedding: ZERO_EMBEDDING,
  },

  // 2. मध्याह्न भोजन योजना — UP
  {
    title: "उत्तर प्रदेश मध्याह्न भोजन योजना खर्च की जानकारी",
    department: "बेसिक शिक्षा विभाग",
    ministry: "शिक्षा मंत्रालय",
    state: "Uttar Pradesh",
    district: "लखनऊ",
    area: null,
    subject:
      "उत्तर प्रदेश के सरकारी स्कूलों में मध्याह्न भोजन योजना के अंतर्गत खर्च की गई राशि और भोजन की गुणवत्ता की जानकारी।",
    questions: [
      "वर्ष 2022-23 में लखनऊ जिले के सरकारी प्राथमिक विद्यालयों में मध्याह्न भोजन योजना पर कुल कितनी राशि खर्च की गई?",
      "प्रति छात्र प्रतिदिन कितनी राशि आवंटित है और वास्तव में कितनी खर्च होती है?",
      "क्या भोजन की गुणवत्ता की नियमित जांच होती है? पिछले एक वर्ष की जांच रिपोर्ट उपलब्ध कराएं।",
      "कितने विद्यालयों में भोजन नहीं परोसा गया और उसके क्या कारण थे?",
    ],
    response_summary: null,
    response_status: "pending",
    date_filed: "2024-01-20",
    date_of_response: null,
    rti_act_sections: ["धारा 6", "धारा 7"],
    tags: ["शिक्षा", "मध्याह्न भोजन", "MDM", "Uttar Pradesh", "पारदर्शिता"],
    language: "hindi",
    is_anonymous: true,
    filer_name: null,
    upvotes: 8,
    view_count: 54,
    extracted_text:
      "यह RTI आवेदन मध्याह्न भोजन योजना (Mid Day Meal Scheme) के अंतर्गत खर्च की जानकारी हेतु है...",
    embedding: ZERO_EMBEDDING,
  },

  // 3. नगर निगम जल आपूर्ति — Delhi
  {
    title: "दिल्ली नगर निगम जल आपूर्ति परियोजना की जानकारी",
    department: "दिल्ली जल बोर्ड",
    ministry: "जल संसाधन विभाग",
    state: "Delhi",
    district: "पूर्वी दिल्ली",
    area: "लक्ष्मी नगर",
    subject:
      "लक्ष्मी नगर क्षेत्र में पेयजल आपूर्ति परियोजना की स्थिति और व्यय की जानकारी।",
    questions: [
      "लक्ष्मी नगर में पेयजल आपूर्ति सुधार परियोजना कब शुरू हुई और इसकी अनुमानित लागत क्या है?",
      "अब तक इस परियोजना पर कितनी राशि खर्च की जा चुकी है और परियोजना की वर्तमान स्थिति क्या है?",
      "इस क्षेत्र में प्रतिदिन पानी की आपूर्ति कितने घंटे होती है और इसकी गुणवत्ता परीक्षण रिपोर्ट क्या कहती है?",
    ],
    response_summary:
      "दिल्ली जल बोर्ड ने परियोजना की जानकारी प्रदान की। परियोजना की लागत ₹45 करोड़ है और 78% कार्य पूर्ण हो चुका है।",
    response_status: "responded",
    date_filed: "2023-08-05",
    date_of_response: "2023-10-12",
    rti_act_sections: ["धारा 6", "धारा 7"],
    tags: ["जल", "पेयजल", "नगर निगम", "Delhi", "बुनियादी सुविधाएं"],
    language: "hindi",
    is_anonymous: false,
    filer_name: "सुनीता देवी",
    upvotes: 21,
    view_count: 143,
    extracted_text:
      "दिल्ली जल बोर्ड को RTI आवेदन — लक्ष्मी नगर क्षेत्र में पेयजल परियोजना की स्थिति जानने हेतु...",
    embedding: ZERO_EMBEDDING,
  },

  // 4. मनरेगा मजदूरी भुगतान — Bihar
  {
    title: "बिहार मनरेगा मजदूरी भुगतान में देरी की शिकायत",
    department: "ग्रामीण विकास विभाग",
    ministry: "ग्रामीण विकास मंत्रालय",
    state: "Bihar",
    district: "गया",
    area: "बोधगया प्रखंड",
    subject:
      "मनरेगा योजना के अंतर्गत बोधगया प्रखंड में मजदूरों को समय पर भुगतान न होने की जांच।",
    questions: [
      "वर्ष 2023-24 में बोधगया प्रखंड में मनरेगा के अंतर्गत कितने मजदूरों को रोजगार दिया गया?",
      "इन मजदूरों को मजदूरी भुगतान में औसतन कितने दिन की देरी हुई?",
      "जिन मजदूरों को 15 दिन से अधिक देरी से भुगतान हुआ, उन्हें विलंब मुआवजा मिला या नहीं?",
      "किन जॉब कार्ड धारकों का भुगतान अभी तक लंबित है?",
    ],
    response_summary: null,
    response_status: "appealed",
    date_filed: "2023-11-30",
    date_of_response: null,
    rti_act_sections: ["धारा 6", "धारा 19"],
    tags: ["मनरेगा", "NREGA", "मजदूरी", "Bihar", "ग्रामीण विकास"],
    language: "hindi",
    is_anonymous: false,
    filer_name: "प्रमोद कुमार",
    upvotes: 34,
    view_count: 201,
    extracted_text:
      "यह आवेदन मनरेगा (महात्मा गांधी राष्ट्रीय ग्रामीण रोजगार गारंटी अधिनियम) के अंतर्गत...",
    embedding: ZERO_EMBEDDING,
  },

  // 5. वन भूमि विचलन — Chhattisgarh
  {
    title: "छत्तीसगढ़ वन भूमि विचलन अनुमति का विवरण",
    department: "वन विभाग",
    ministry: "पर्यावरण, वन एवं जलवायु परिवर्तन मंत्रालय",
    state: "Chhattisgarh",
    district: "सरगुजा",
    area: "उदयपुर तहसील",
    subject:
      "सरगुजा जिले में वन भूमि को गैर-वानिकी उद्देश्यों के लिए विचलित करने की अनुमतियों का विवरण।",
    questions: [
      "वर्ष 2020-2023 के बीच सरगुजा जिले में कितनी वन भूमि को गैर-वानिकी कार्यों के लिए विचलित किया गया?",
      "इन विचलनों के लिए किन संस्थाओं/कंपनियों को अनुमति दी गई?",
      "वन संरक्षण अधिनियम के अंतर्गत ग्राम सभाओं की सहमति ली गई या नहीं?",
    ],
    response_summary:
      "विभाग ने जानकारी देने से मना किया, यह कहते हुए कि मामला न्यायालय में विचाराधीन है।",
    response_status: "rejected",
    date_filed: "2022-09-14",
    date_of_response: "2022-12-01",
    rti_act_sections: ["धारा 6", "धारा 7", "धारा 8(1)(b)"],
    tags: ["वन", "भूमि", "Chhattisgarh", "पर्यावरण", "आदिवासी"],
    language: "hindi",
    is_anonymous: true,
    filer_name: null,
    upvotes: 45,
    view_count: 312,
    extracted_text:
      "वन विभाग छत्तीसगढ़ को RTI आवेदन — वन भूमि विचलन अनुमति की जानकारी हेतु...",
    embedding: ZERO_EMBEDDING,
  },

  // 6. विद्यालय अवसंरचना — Karnataka
  {
    title: "Karnataka government school infrastructure status report",
    department: "Department of Public Instruction",
    ministry: "Education Department, Karnataka",
    state: "Karnataka",
    district: "Mysuru",
    area: "Mysuru Rural",
    subject:
      "Status of government primary school buildings, toilets, drinking water, and teaching staff in Mysuru district.",
    questions: [
      "How many government primary schools in Mysuru district have dilapidated or condemned buildings as of 2023-24?",
      "In how many schools do functional toilets (separate for girls) exist?",
      "What is the current teacher vacancy position in government primary schools in Mysuru district?",
      "What funds were received under Samagra Shiksha in 2022-23 and how were they utilized?",
    ],
    response_summary:
      "Department provided data: 23 schools with condemned buildings, 89% have functional toilets, 456 teacher vacancies pending.",
    response_status: "responded",
    date_filed: "2023-06-01",
    date_of_response: "2023-08-15",
    rti_act_sections: ["Section 6", "Section 7"],
    tags: ["Education", "Schools", "Karnataka", "Infrastructure", "Teachers"],
    language: "english",
    is_anonymous: false,
    filer_name: "Kavitha Reddy",
    upvotes: 18,
    view_count: 97,
    extracted_text:
      "RTI Application to Department of Public Instruction, Karnataka regarding school infrastructure...",
    embedding: ZERO_EMBEDDING,
  },

  // 7. PDS राशन कार्ड — Tamil Nadu
  {
    title: "तमिलनाडु PDS राशन कार्ड वितरण अनियमितता",
    department: "नागरिक आपूर्ति एवं उपभोक्ता संरक्षण विभाग",
    ministry: "खाद्य एवं उपभोक्ता मामले विभाग",
    state: "Tamil Nadu",
    district: "चेन्नई",
    area: "तिरुवोट्टियूर",
    subject:
      "तिरुवोट्टियूर क्षेत्र में पीडीएस राशन कार्ड वितरण में अनियमितताओं एवं नकली राशन कार्डों की जांच।",
    questions: [
      "तिरुवोट्टियूर में कितने राशन कार्ड सक्रिय हैं और पिछले 3 वर्षों में कितने नए कार्ड जारी किए गए?",
      "क्या नकली या डुप्लीकेट राशन कार्डों की जांच की गई? जांच रिपोर्ट उपलब्ध कराएं।",
      "इस क्षेत्र में उचित मूल्य की दुकानों पर प्रतिमाह कितना अनाज वितरित होता है?",
    ],
    response_summary: null,
    response_status: "pending",
    date_filed: "2024-02-10",
    date_of_response: null,
    rti_act_sections: ["धारा 6"],
    tags: ["PDS", "राशन", "Tamil Nadu", "सार्वजनिक वितरण", "भ्रष्टाचार"],
    language: "mixed",
    is_anonymous: true,
    filer_name: null,
    upvotes: 6,
    view_count: 41,
    extracted_text:
      "PDS (सार्वजनिक वितरण प्रणाली) के अंतर्गत राशन कार्ड वितरण में अनियमितताओं की जानकारी...",
    embedding: ZERO_EMBEDDING,
  },

  // 8. थाना FIR रिकॉर्ड — Rajasthan
  {
    title: "राजस्थान पुलिस थाने में FIR दर्ज न होने की जानकारी",
    department: "राजस्थान पुलिस",
    ministry: "गृह विभाग",
    state: "Rajasthan",
    district: "जोधपुर",
    area: "पावटा थाना क्षेत्र",
    subject:
      "पावटा थाने में महिलाओं के विरुद्ध अपराधों की FIR दर्ज करने में पुलिस की विफलता की जांच।",
    questions: [
      "वर्ष 2023 में पावटा थाने में महिला उत्पीड़न से संबंधित कितनी FIR दर्ज हुईं?",
      "कितनी शिकायतें FIR में परिवर्तित नहीं की गईं और उसके क्या कारण दर्ज हैं?",
      "क्या 'FIR न दर्ज करना' विषय पर कोई शिकायत पुलिस अधीक्षक कार्यालय में प्राप्त हुई?",
    ],
    response_summary: null,
    response_status: "pending",
    date_filed: "2024-03-01",
    date_of_response: null,
    rti_act_sections: ["धारा 6", "धारा 7"],
    tags: ["पुलिस", "FIR", "महिला", "Rajasthan", "न्याय"],
    language: "hindi",
    is_anonymous: true,
    filer_name: null,
    upvotes: 29,
    view_count: 178,
    extracted_text:
      "राजस्थान पुलिस, पावटा थाने को RTI आवेदन — महिला उत्पीड़न FIR की जानकारी हेतु...",
    embedding: ZERO_EMBEDDING,
  },

  // 9. शहरी विकास अनुमोदन — Gujarat
  {
    title: "Gujarat GDCR building permission irregularities Ahmedabad",
    department: "Ahmedabad Municipal Corporation",
    ministry: "Urban Development Department, Gujarat",
    state: "Gujarat",
    district: "Ahmedabad",
    area: "Satellite Road",
    subject:
      "RTI regarding building plan approvals and GDCR violations on Satellite Road, Ahmedabad from 2020-2023.",
    questions: [
      "How many building plan approvals were granted on Satellite Road between 2020-2023?",
      "Were any approved buildings found to be violating GDCR norms? If yes, what action was taken?",
      "Provide copies of the approved building plans for survey numbers mentioned in attached list.",
      "Were any demolition notices issued for unauthorized constructions on this road?",
    ],
    response_summary:
      "AMC provided partial information — 127 approvals granted, 14 violations detected, 3 demolition notices issued.",
    response_status: "partial",
    date_filed: "2023-04-20",
    date_of_response: "2023-07-05",
    rti_act_sections: ["Section 6", "Section 7", "Section 11"],
    tags: ["Urban Development", "Building Permission", "Gujarat", "AMC", "GDCR"],
    language: "english",
    is_anonymous: false,
    filer_name: "Mihir Shah",
    upvotes: 15,
    view_count: 112,
    extracted_text:
      "RTI Application to Ahmedabad Municipal Corporation regarding building plan approvals on Satellite Road...",
    embedding: ZERO_EMBEDDING,
  },

  // 10. अस्पताल कर्मचारी उपस्थिति — Odisha
  {
    title: "ओडिशा जिला अस्पताल में डॉक्टरों की अनुपस्थिति की जांच",
    department: "स्वास्थ्य एवं परिवार कल्याण विभाग",
    ministry: "स्वास्थ्य मंत्रालय",
    state: "Odisha",
    district: "कोरापुट",
    area: null,
    subject:
      "कोरापुट जिला अस्पताल में डॉक्टरों और नर्सिंग स्टाफ की उपस्थिति और रिक्त पदों की जानकारी।",
    questions: [
      "कोरापुट जिला अस्पताल में कितने डॉक्टरों के पद स्वीकृत हैं और वर्तमान में कितने कार्यरत हैं?",
      "पिछले 6 माह में किन डॉक्टरों ने अनधिकृत अनुपस्थिति की और उनके विरुद्ध क्या कार्रवाई हुई?",
      "अस्पताल में नर्सिंग स्टाफ की स्थिति क्या है? ICU और OT में स्टाफ की कमी है?",
      "2023-24 में अस्पताल के लिए कितना बजट आवंटित हुआ और किस मद में खर्च हुआ?",
    ],
    response_summary:
      "अस्पताल ने आंशिक जानकारी प्रदान की। 18 में से केवल 11 डॉक्टर कार्यरत हैं।",
    response_status: "partial",
    date_filed: "2023-12-10",
    date_of_response: "2024-02-28",
    rti_act_sections: ["धारा 6", "धारा 7"],
    tags: ["स्वास्थ्य", "अस्पताल", "Odisha", "डॉक्टर", "सेवा"],
    language: "hindi",
    is_anonymous: false,
    filer_name: "नारायण पात्रो",
    upvotes: 23,
    view_count: 156,
    extracted_text:
      "कोरापुट जिला अस्पताल को RTI आवेदन — चिकित्सकों की उपस्थिति और रिक्त पदों की जानकारी हेतु...",
    embedding: ZERO_EMBEDDING,
  },
];

async function seed() {
  console.log("🌱 Seeding RTI Knowledge Base with 10 sample entries...\n");

  let successCount = 0;

  for (const entry of seedData) {
    const { error } = await supabase.from("rti_entries").insert({
      ...entry,
      file_url: null,
      file_type: "pdf",
      verified: Math.random() > 0.5,
    });

    if (error) {
      console.error(`❌ Failed to insert: ${entry.title}`);
      console.error(`   Error: ${error.message}`);
    } else {
      console.log(`✅ Inserted: ${entry.title}`);
      successCount++;
    }
  }

  console.log(
    `\n🎉 Seeding complete! ${successCount}/${seedData.length} entries inserted.`
  );

  if (successCount < seedData.length) {
    console.log(
      "\n⚠️  Some entries failed. Make sure your schema is set up correctly."
    );
    console.log(
      "   Run supabase/migrations/001_init.sql in your Supabase SQL editor first."
    );
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
