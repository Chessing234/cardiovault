import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

import { RAG_CONFIG } from './rag-config';
import { createVectorStoreFromDocuments, loadVectorStoreFromDisk } from './vector-store';

/**
 * Curated cardiovascular knowledge base for hackathon demos.
 *
 * Production should ingest PubMed / publisher APIs with licensing, versioning, and PDF parsing.
 */
export const MEDICAL_LITERATURE: {
  title: string;
  source: string;
  category: string;
  content: string;
}[] = [
  {
    title: 'Hypertension Management Guidelines 2024',
    source: 'American Heart Association, 2024',
    category: 'hypertension',
    content: `Blood pressure classification: Normal is less than 120/80 mmHg. Elevated is 120-129 systolic and less than 80 diastolic. Stage 1 hypertension is 130-139 or 80-89. Stage 2 hypertension is 140 or higher or 90 or higher. Hypertensive crisis is higher than 180 and/or higher than 120. Lifestyle modifications are first-line treatment for elevated blood pressure and stage 1 hypertension. These include weight reduction (target BMI under 25), DASH diet (rich in fruits, vegetables, whole grains), sodium restriction (under 1500mg/day), potassium supplementation (3500-5000mg/day), physical activity (150 minutes moderate or 75 minutes vigorous per week), and limiting alcohol (men under 2 drinks/day, women under 1).`,
  },
  {
    title: 'LDL Cholesterol and Cardiovascular Risk',
    source: 'Journal of the American College of Cardiology, 2023',
    category: 'cholesterol',
    content: `LDL cholesterol is often called "bad cholesterol" because it contributes to fatty buildup in arteries (atherosclerosis). Optimal LDL is under 100 mg/dL. Near optimal is 100-129. Borderline high is 130-159. High is 160-189. Very high is 190 and above. For high-risk patients (existing heart disease), the target LDL is under 70 mg/dL. Statins are the first-line medication for lowering LDL. They work by inhibiting HMG-CoA reductase in the liver. Common statins include atorvastatin, rosuvastatin, and simvastatin. Side effects may include muscle pain and elevated liver enzymes. Ezetimibe can be added for additional LDL reduction. PCSK9 inhibitors are reserved for familial hypercholesterolemia or statin-intolerant patients.`,
  },
  {
    title: 'HDL Cholesterol: The Protective Factor',
    source: 'Circulation Research, 2023',
    category: 'cholesterol',
    content: `HDL cholesterol is often called "good cholesterol" because it helps remove LDL from the bloodstream. HDL under 40 mg/dL in men or under 50 mg/dL in women is considered low and is a risk factor for heart disease. HDL of 60 mg/dL or higher is protective. Unlike LDL, there are no medications that specifically raise HDL in a way that reduces cardiovascular events. The best ways to improve HDL are: regular aerobic exercise (raises HDL by 5-10%), smoking cessation (can raise HDL by 10%), weight loss (each 3kg lost raises HDL by 1 mg/dL), moderate alcohol consumption, and omega-3 fatty acids from fish. Niacin can raise HDL but the AIM-HIGH trial showed it does not reduce events when LDL is already controlled.`,
  },
  {
    title: 'Framingham Risk Score for Cardiovascular Disease',
    source: 'Framingham Heart Study, Original and Updated',
    category: 'prevention',
    content: `The Framingham Risk Score estimates 10-year cardiovascular risk based on age, gender, total cholesterol, HDL cholesterol, systolic blood pressure, blood pressure treatment status, smoking status, and diabetes status. Risk categories: Under 5% is low risk, 5-10% is intermediate risk, 10-20% is high risk, and over 20% is very high risk. For intermediate risk patients (5-10%), additional risk factors to consider include family history of premature heart disease, elevated hs-CRP, coronary artery calcium score, ankle-brachial index, and elevated lifetime risk. The Framingham score has limitations: it was developed in a predominantly white population and may underestimate risk in some ethnic groups. The Pooled Cohort Equations (ASCVD Risk Calculator) is now preferred for primary prevention.`,
  },
  {
    title: 'Physical Activity and Heart Health',
    source: 'AHA Scientific Statement, 2024',
    category: 'lifestyle_modification',
    content: `Regular physical activity reduces cardiovascular mortality by 20-30%. The current recommendation is at least 150 minutes per week of moderate-intensity aerobic activity or 75 minutes of vigorous activity, plus muscle-strengthening activities on 2 or more days per week. For blood pressure reduction, aerobic exercise lowers systolic BP by 5-7 mmHg on average. For cholesterol, exercise raises HDL by 5-10% and can lower triglycerides by 10-20%. Walking, swimming, cycling, and jogging are excellent choices. Resistance training twice a week improves vascular function. Sedentary behavior (sitting over 8 hours/day) is an independent risk factor even in those who exercise. Break up sitting every 30-60 minutes with brief activity.`,
  },
  {
    title: 'Diet and Cardiovascular Disease Prevention',
    source: 'European Heart Journal, 2023',
    category: 'lifestyle_modification',
    content: `The Mediterranean diet is the most evidence-based dietary pattern for cardiovascular prevention. Key components: olive oil (2-4 tablespoons/day), nuts (30g/day), fish (3+ servings/week), fruits and vegetables (5+ servings/day), whole grains, and legumes. The DASH diet (Dietary Approaches to Stop Hypertension) is equally effective: emphasizes fruits, vegetables, low-fat dairy, whole grains, lean protein. Key dietary factors to limit: sodium (under 2000mg/day for hypertension patients), added sugars (under 25g/day), trans fats (avoid completely), saturated fats (under 10% of calories). The PREDIMED trial showed the Mediterranean diet reduced major cardiovascular events by 30% in high-risk patients. Omega-3 supplements (EPA/DHA 1-4g/day) reduce triglycerides and may reduce arrhythmias.`,
  },
  {
    title: 'Diabetes and Cardiovascular Risk',
    source: 'Diabetes Care, 2024',
    category: 'heart_failure',
    content: `Diabetes mellitus increases cardiovascular disease risk by 2-4 fold. Over 65% of deaths in diabetic patients are from cardiovascular causes. Key mechanisms: hyperglycemia causes endothelial dysfunction, advanced glycation end-products promote atherosclerosis, and insulin resistance is pro-inflammatory. Management targets for diabetic patients: HbA1c under 7%, blood pressure under 130/80, LDL under 70 mg/dL if ASCVD present, under 100 otherwise. SGLT2 inhibitors (empagliflozin, dapagliflozin) and GLP-1 receptor agonists (semaglutide, liraglutide) are now first-line for diabetic patients with cardiovascular disease because they reduce heart failure hospitalizations and cardiovascular death independent of glucose control. ACE inhibitors or ARBs are preferred for blood pressure control in diabetic patients due to renal protective effects.`,
  },
  {
    title: 'Smoking Cessation and Cardiovascular Benefits',
    source: 'JAMA Cardiology, 2023',
    category: 'prevention',
    content: `Smoking is the single most modifiable risk factor for cardiovascular disease. It causes about 1 in 4 cardiovascular deaths. Chemicals in tobacco damage blood vessel endothelium, promote inflammation, increase LDL oxidation, and reduce HDL. The good news: cardiovascular benefits begin within days of quitting. At 1 year of quitting, excess risk of coronary heart disease is half that of a smoker. At 5 years, stroke risk is reduced to that of a non-smoker. At 15 years, CHD risk is similar to never-smokers. Effective cessation methods: nicotine replacement therapy (patch + gum/lozenge doubles success rates), varenicline (most effective single agent, triples quit rates), bupropion, and behavioral counseling. Combining pharmacotherapy with counseling produces the highest quit rates (30-35% at 6 months).`,
  },
  {
    title: 'Stress Management and Heart Health',
    source: 'American Journal of Cardiology, 2023',
    category: 'lifestyle_modification',
    content: `Chronic psychological stress is associated with 40% increased cardiovascular risk. Mechanisms include: elevated cortisol (promotes hypertension, insulin resistance, abdominal obesity), sympathetic nervous system overactivation (increases heart rate and blood pressure), and pro-inflammatory cytokines. Effective stress reduction interventions: mindfulness meditation (lowers BP by 4-5 mmHg), yoga (improves vascular function), cognitive behavioral therapy, social support (strong relationships reduce cardiac mortality by 50%), adequate sleep (7-9 hours, poor sleep increases CVD risk by 20%), and work-life balance. The INTERHEART study found that psychosocial stress accounted for approximately 33% of the population-attributable risk of acute myocardial infarction.`,
  },
  {
    title: 'Coronary Artery Calcium Scoring',
    source: 'JACC: Cardiovascular Imaging, 2024',
    category: 'diagnostics',
    content: `Coronary Artery Calcium (CAC) scoring via CT scan is the best non-invasive tool for atherosclerosis detection. A CAC score of 0 indicates very low 10-year cardiovascular risk (under 1%). Scores 1-99 are mild, 100-399 moderate, 400+ severe. The CAC score adds significant risk stratification beyond traditional risk factors. For patients with intermediate Framingham/ASCVD risk (5-20%), CAC scoring helps guide statin therapy: score 0 may allow deferring statins (unless smoker, diabetic, or family history), while any score over 0 supports statin initiation. CAC progression over 15-25% per year indicates active atherosclerosis despite therapy. Radiation exposure from CAC CT is very low (approximately 1 mSv, comparable to annual background radiation).`,
  },
];

let inflight: Promise<number> | null = null;
let lastChunkCount = 0;

async function buildChunkedDocuments(): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: RAG_CONFIG.chunkSize,
    chunkOverlap: RAG_CONFIG.chunkOverlap,
    separators: ['\n\n', '\n', '. ', ' '],
  });

  const allChunks: Document[] = [];

  for (const article of MEDICAL_LITERATURE) {
    const chunks = await splitter.splitText(article.content);
    chunks.forEach((chunk, i) => {
      allChunks.push(
        new Document({
          pageContent: chunk,
          metadata: {
            title: article.title,
            source: article.source,
            category: article.category,
            chunkIndex: i,
          },
        }),
      );
    });
  }

  return allChunks;
}

async function initializeMedicalKBInternal(): Promise<number> {
  const loaded = await loadVectorStoreFromDisk();
  if (loaded) {
    return lastChunkCount || -1;
  }

  const allChunks = await buildChunkedDocuments();
  await createVectorStoreFromDocuments(allChunks);
  lastChunkCount = allChunks.length;
  return lastChunkCount;
}

/**
 * Idempotently loads an existing FAISS store from disk or builds it from the curated KB.
 */
export async function ensureMedicalKbIndexed(): Promise<number> {
  inflight = inflight ?? initializeMedicalKBInternal();
  return inflight;
}

/** @deprecated Use `ensureMedicalKbIndexed()` (same behavior). */
export async function initializeMedicalKB(): Promise<number> {
  return ensureMedicalKbIndexed();
}

export function getMedicalCategories(): string[] {
  return [...new Set(MEDICAL_LITERATURE.map((a) => a.category))];
}
