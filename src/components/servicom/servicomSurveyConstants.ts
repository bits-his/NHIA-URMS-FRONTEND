/** HCF Customer Satisfaction Survey Survey — Yes=1, No=0 */
export const SATISFACTION_QUESTIONS = [
  { id: "Q01", category: "SERVICE DELIVERY", question: "Are there physical or bureaucratic obstacles to access?" },
  { id: "Q02", category: "SERVICE DELIVERY", question: "Is the facility open for NHIS enrollees only during working hours?" },
  { id: "Q03", category: "SERVICE DELIVERY", question: "Does the HCF recognise poor performance?" },
  { id: "Q04", category: "SERVICE DELIVERY", question: "Does the HCF give honest explanation of the reasons for poor performance?" },
  { id: "Q05", category: "SERVICE DELIVERY", question: "Does the HCF take remedial action for poor performance?" },
  { id: "Q06", category: "TIMELINESS", question: "Are staff seen and perceived to provide prompt service?" },
  { id: "Q07", category: "TIMELINESS", question: "Is there any system in place to monitor waiting time?" },
  { id: "Q08", category: "TIMELINESS", question: "Is there reasonable explanation for delays that are not a regular occurrence?" },
  { id: "Q09", category: "TIMELINESS", question: "Are customers told of any unforeseen interruptions to service?" },
  { id: "Q10", category: "INFORMATION", question: "Does the healthcare facility publish the NHIS drug list?" },
  { id: "Q11", category: "INFORMATION", question: "Does the HCF give enrollees sufficient information with respect to referrals?" },
  { id: "Q12", category: "PROFESSIONALISM", question: "Are appointment procedures clearly detailed at all service points for enrollees to see?" },
  { id: "Q13", category: "PROFESSIONALISM", question: "Do hospital staff adhere to these procedures and give no unfair preference to certain customers?" },
  { id: "Q14", category: "PROFESSIONALISM", question: "Do staff adhere to procedures and there are no hidden costs to enrolees?" },
  { id: "Q15", category: "STAFF ATTITUDE", question: "How sympathetic are hospital staff to enrolee needs?" },
  { id: "Q16", category: "STAFF ATTITUDE", question: "Are staff polite, friendly and attentive to enrolees?" },
  { id: "Q17", category: "STAFF ATTITUDE", question: "Are suitable facilities for privacy available?" },
] as const;

export const SATISFACTION_CATEGORIES = [
  "SERVICE DELIVERY",
  "TIMELINESS",
  "INFORMATION",
  "PROFESSIONALISM",
  "STAFF ATTITUDE",
] as const;

export type SatisfactionCategory = (typeof SATISFACTION_CATEGORIES)[number];

export function satisfactionCategoryLabel(category: string) {
  return category.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function questionsForCategory(category: string) {
  return SATISFACTION_QUESTIONS.filter((q) => q.category === category);
}

export const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes", score: 1 },
  { value: "no", label: "No", score: 0 },
] as const;

/** Citizens' Comment Card — Charter Performance */
export const COMMENT_CARD_SCALE_5 = [
  { value: "1", label: "Poor (1)", score: 1 },
  { value: "2", label: "Fair (2)", score: 2 },
  { value: "3", label: "Acceptable (3)", score: 3 },
  { value: "4", label: "Commendable (4)", score: 4 },
  { value: "5", label: "Excellent (5)", score: 5 },
] as const;

export const COMMENT_CARD_SCALE_4 = [
  { value: "1", label: "Strongly Disagree (1)", score: 1 },
  { value: "2", label: "Disagree (2)", score: 2 },
  { value: "3", label: "Agree (3)", score: 3 },
  { value: "4", label: "Strongly Agree (4)", score: 4 },
] as const;

export type CommentCardQuestion = {
  id: string;
  section: string;
  question: string;
  scale: "5" | "4";
  scaleLabel: string;
};

export const COMMENT_CARD_QUESTIONS: CommentCardQuestion[] = [
  {
    id: "Q01",
    section: "Reception",
    question: "How would you rate the quality of service received at our reception?",
    scale: "5",
    scaleLabel: "Poor (1) to Excellent (5)",
  },
  {
    id: "Q02",
    section: "Front Desk Staff",
    question: "Front desk staff are courteous & polite",
    scale: "4",
    scaleLabel: "Strongly Disagree (1) to Strongly Agree (4)",
  },
  {
    id: "Q03",
    section: "Front Desk Staff",
    question: "Front desk staff are professional & well-informed",
    scale: "4",
    scaleLabel: "Strongly Disagree (1) to Strongly Agree (4)",
  },
  {
    id: "Q04",
    section: "Front Desk Staff",
    question: "Front desk staff are prompt & efficient",
    scale: "4",
    scaleLabel: "Strongly Disagree (1) to Strongly Agree (4)",
  },
  {
    id: "Q05",
    section: "Overall",
    question: "Overall rating of the quality of service / interaction within our organisation",
    scale: "5",
    scaleLabel: "Poor (1) to Excellent (5)",
  },
];

export function computeSatisfactionScore(responses: Record<string, string>) {
  let total = 0;
  let answered = 0;
  for (const q of SATISFACTION_QUESTIONS) {
    const val = responses[q.id];
    if (val === "yes") { total += 1; answered += 1; }
    else if (val === "no") { answered += 1; }
  }
  const max = SATISFACTION_QUESTIONS.length;
  const percentage = max ? Math.round((total / max) * 1000) / 10 : 0;
  return { total, max, answered, percentage };
}

export function computeCommentCardScore(responses: Record<string, string>) {
  let total = 0;
  let answered = 0;
  for (const q of COMMENT_CARD_QUESTIONS) {
    const val = responses[q.id];
    if (!val) continue;
    total += Number(val);
    answered += 1;
  }
  const average = answered ? Math.round((total / answered) * 100) / 100 : 0;
  return { total, answered, average };
}

export function commentCardScaleOptions(scale: "5" | "4") {
  return scale === "5" ? COMMENT_CARD_SCALE_5 : COMMENT_CARD_SCALE_4;
}

/** User-facing label without numeric score suffix */
export function commentCardResponseLabel(label: string) {
  return label.replace(/\s*\(\d+\)$/, "");
}
