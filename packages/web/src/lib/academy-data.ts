/**
 * CardioVault Academy curriculum data.
 * Organized into modules, each with lessons and quizzes.
 */

export interface Lesson {
  id: string;
  title: string;
  moduleId: string;
  order: number;
  content: string;
  estimatedMinutes: number;
  quiz: Quiz;
  heartPoints: number;
}

export interface Quiz {
  id: string;
  questions: QuizQuestion[];
  passingScore: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export type ModuleIconName = 'Heart' | 'Activity' | 'Droplets' | 'Apple';

export interface Module {
  id: string;
  title: string;
  description: string;
  icon: ModuleIconName;
  color: string;
  lessons: Lesson[];
  totalHeartPoints: number;
}

export interface UserProgress {
  completedLessons: string[];
  quizScores: Record<string, number>;
  totalHeartPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
}

export const ACADEMY_MODULES: Module[] = [
  {
    id: 'heart-basics',
    title: 'Heart Basics',
    description:
      'Understanding how your heart works and what cardiovascular disease means.',
    icon: 'Heart',
    color: 'text-cv-red',
    totalHeartPoints: 100,
    lessons: [
      {
        id: 'hb-1',
        title: 'Anatomy of the Heart',
        moduleId: 'heart-basics',
        order: 1,
        estimatedMinutes: 5,
        heartPoints: 50,
        content: `
# How Your Heart Works

Your heart is a muscular organ about the size of your fist, located slightly left of center in your chest. It pumps blood throughout your body through a network of blood vessels.

## Key Components

- **Four Chambers**: Two atria (upper) and two ventricles (lower)
- **Right Side**: Pumps deoxygenated blood to the lungs
- **Left Side**: Pumps oxygenated blood to the body
- **Valves**: Ensure one-way blood flow (mitral, aortic, tricuspid, pulmonary)
- **Electrical System**: SA node (natural pacemaker) controls heart rate

## The Cardiac Cycle

1. **Systole**: Heart contracts, pumping blood out
2. **Diastole**: Heart relaxes, filling with blood
3. A normal resting heart rate is 60-100 beats per minute

## Blood Vessels

- **Arteries**: Carry blood AWAY from the heart (oxygen-rich, except pulmonary)
- **Veins**: Carry blood TO the heart (oxygen-poor, except pulmonary)
- **Capillaries**: Tiny vessels where oxygen/carbon dioxide exchange happens
        `,
        quiz: {
          id: 'hb-1-quiz',
          passingScore: 70,
          questions: [
            {
              id: 'q1',
              question: 'How many chambers does the human heart have?',
              options: ['2', '3', '4', '5'],
              correctIndex: 2,
              explanation:
                'The heart has four chambers: two atria (upper) and two ventricles (lower).',
            },
            {
              id: 'q2',
              question: 'What is the normal resting heart rate range?',
              options: ['30-50 bpm', '60-100 bpm', '100-140 bpm', '140-180 bpm'],
              correctIndex: 1,
              explanation:
                'A normal resting heart rate is between 60 and 100 beats per minute.',
            },
            {
              id: 'q3',
              question: 'Which blood vessels carry oxygen-rich blood away from the heart?',
              options: ['Veins', 'Capillaries', 'Arteries', 'Venules'],
              correctIndex: 2,
              explanation:
                'Arteries carry oxygen-rich blood away from the heart to the body (with the exception of the pulmonary artery).',
            },
          ],
        },
      },
      {
        id: 'hb-2',
        title: 'What is Cardiovascular Disease?',
        moduleId: 'heart-basics',
        order: 2,
        estimatedMinutes: 7,
        heartPoints: 50,
        content: `
# Understanding Cardiovascular Disease

Cardiovascular disease (CVD) refers to a group of conditions affecting the heart and blood vessels. It is the **leading cause of death globally**, accounting for approximately 32% of all deaths worldwide.

## Types of Cardiovascular Disease

### Coronary Artery Disease (CAD)
- Most common type of CVD
- Caused by plaque buildup (atherosclerosis) in coronary arteries
- Can lead to chest pain (angina) and heart attacks

### Heart Failure
- Heart cannot pump enough blood to meet the body's needs
- Affects 6.2 million Americans
- Often develops after other heart conditions weaken the heart

### Arrhythmia
- Abnormal heart rhythms
- Can be too fast (tachycardia), too slow (bradycardia), or irregular
- Atrial fibrillation is the most common type

### Stroke
- Occurs when blood flow to the brain is interrupted
- Ischemic stroke: blocked artery (85% of strokes)
- Hemorrhagic stroke: bleeding in the brain

### Hypertension (High Blood Pressure)
- Blood pressure consistently above 130/80 mmHg
- Called the "silent killer" because it often has no symptoms
- Major risk factor for all other CVD types

## Risk Factors

| Modifiable | Non-Modifiable |
|-----------|---------------|
| Smoking | Age |
| Physical inactivity | Gender |
| Poor diet | Family history |
| Obesity | Genetics |
| High cholesterol | Race/ethnicity |
| Diabetes | |
| Stress | |
| Alcohol abuse | |

## Prevention

Up to 80% of cardiovascular disease is preventable through lifestyle changes.
        `,
        quiz: {
          id: 'hb-2-quiz',
          passingScore: 70,
          questions: [
            {
              id: 'q1',
              question: 'What percentage of global deaths is caused by cardiovascular disease?',
              options: ['15%', '32%', '45%', '60%'],
              correctIndex: 1,
              explanation:
                'Cardiovascular disease accounts for approximately 32% of all deaths worldwide.',
            },
            {
              id: 'q2',
              question: 'Which of the following is NOT a modifiable risk factor?',
              options: ['Smoking', 'Physical inactivity', 'Age', 'Poor diet'],
              correctIndex: 2,
              explanation:
                'Age is a non-modifiable risk factor. You cannot change your age, but you can change lifestyle factors.',
            },
            {
              id: 'q3',
              question: 'What percentage of CVD is preventable through lifestyle changes?',
              options: ['50%', '65%', '80%', '95%'],
              correctIndex: 2,
              explanation:
                'Up to 80% of cardiovascular disease is preventable through lifestyle modifications.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'blood-pressure',
    title: 'Blood Pressure',
    description: 'Learn about blood pressure, how to measure it, and how to keep it healthy.',
    icon: 'Activity',
    color: 'text-cv-blue',
    totalHeartPoints: 100,
    lessons: [
      {
        id: 'bp-1',
        title: 'Understanding Blood Pressure Readings',
        moduleId: 'blood-pressure',
        order: 1,
        estimatedMinutes: 6,
        heartPoints: 100,
        content: `
# Blood Pressure Readings

Blood pressure is measured using two numbers:

## Systolic Pressure (Top Number)
- Pressure when the heart beats and pumps blood
- Normal: less than 120 mmHg

## Diastolic Pressure (Bottom Number)
- Pressure when the heart rests between beats
- Normal: less than 80 mmHg

## Blood Pressure Categories

| Category | Systolic | | Diastolic |
|----------|----------|-|-----------|
| Normal | Less than 120 | and | Less than 80 |
| Elevated | 120-129 | and | Less than 80 |
| Stage 1 Hypertension | 130-139 | or | 80-89 |
| Stage 2 Hypertension | 140 or higher | or | 90 or higher |
| Hypertensive Crisis | Higher than 180 | and/or | Higher than 120 |

## How to Measure Accurately

1. Rest for 5 minutes before measuring
2. Sit with back supported, feet flat on floor
3. Arm supported at heart level
4. Use correct cuff size
5. Take 2-3 readings and average them
6. Measure at the same time each day
        `,
        quiz: {
          id: 'bp-1-quiz',
          passingScore: 75,
          questions: [
            {
              id: 'q1',
              question: 'What is considered normal blood pressure?',
              options: ['Less than 140/90', 'Less than 130/80', 'Less than 120/80', 'Less than 110/70'],
              correctIndex: 2,
              explanation:
                'Normal blood pressure is less than 120/80 mmHg according to AHA guidelines.',
            },
            {
              id: 'q2',
              question: 'What does the top number (systolic) represent?',
              options: [
                'Pressure when heart rests',
                'Pressure when heart beats',
                'Pulse rate',
                'Blood oxygen level',
              ],
              correctIndex: 1,
              explanation:
                'Systolic pressure is the pressure in arteries when the heart beats and pumps blood out.',
            },
            {
              id: 'q3',
              question: 'At what level is blood pressure considered a hypertensive crisis?',
              options: ['140/90', '160/100', '180/120', '200/140'],
              correctIndex: 2,
              explanation:
                'A hypertensive crisis is defined as blood pressure higher than 180/120 mmHg, requiring immediate medical attention.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'cholesterol',
    title: 'Cholesterol',
    description: 'Good vs bad cholesterol, lipid panels, and management strategies.',
    icon: 'Droplets',
    color: 'text-cv-teal',
    totalHeartPoints: 100,
    lessons: [
      {
        id: 'ch-1',
        title: 'Understanding Your Lipid Panel',
        moduleId: 'cholesterol',
        order: 1,
        estimatedMinutes: 8,
        heartPoints: 100,
        content: `
# Your Lipid Panel Explained

A lipid panel measures different types of cholesterol and fats in your blood.

## LDL Cholesterol (Bad)
- Transports cholesterol to arteries
- Builds up as plaque (atherosclerosis)
- Optimal: Less than 100 mg/dL
- Very High: 190+ mg/dL

## HDL Cholesterol (Good)
- Removes cholesterol from bloodstream
- Returns it to liver for disposal
- Higher is better
- Men: 40+ mg/dL, Women: 50+ mg/dL
- 60+ mg/dL is protective

## Triglycerides
- Type of fat in blood
- Normal: Less than 150 mg/dL
- High: 200-499 mg/dL
- Very high: 500+ mg/dL

## Total Cholesterol
- Sum of all cholesterol types
- Desirable: Less than 200 mg/dL

## The LDL/HDL Ratio
- Ratio of bad to good cholesterol
- Ideal: Less than 3.5
- Calculated by dividing LDL by HDL

## How to Improve Your Numbers

- **Increase HDL**: Exercise, quit smoking, lose weight, moderate alcohol
- **Decrease LDL**: Reduce saturated fats, eat more fiber, consider statins
- **Decrease Triglycerides**: Limit sugar/alcohol, exercise, omega-3s
        `,
        quiz: {
          id: 'ch-1-quiz',
          passingScore: 75,
          questions: [
            {
              id: 'q1',
              question: 'Which cholesterol is known as "bad cholesterol"?',
              options: ['HDL', 'LDL', 'Triglycerides', 'VLDL'],
              correctIndex: 1,
              explanation:
                'LDL (Low-Density Lipoprotein) is called bad cholesterol because it transports cholesterol to arteries, causing plaque buildup.',
            },
            {
              id: 'q2',
              question: 'What is the optimal LDL level?',
              options: ['Less than 130', 'Less than 100', 'Less than 160', 'Less than 70'],
              correctIndex: 1,
              explanation:
                'Optimal LDL cholesterol is less than 100 mg/dL. For high-risk patients, the target is under 70 mg/dL.',
            },
            {
              id: 'q3',
              question: 'What HDL level is considered protective against heart disease?',
              options: ['30+ mg/dL', '40+ mg/dL', '50+ mg/dL', '60+ mg/dL'],
              correctIndex: 3,
              explanation: 'HDL of 60 mg/dL or higher is considered protective against heart disease.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'lifestyle',
    title: 'Heart-Healthy Lifestyle',
    description: 'Diet, exercise, stress management, and habits for a healthy heart.',
    icon: 'Apple',
    color: 'text-green-400',
    totalHeartPoints: 100,
    lessons: [
      {
        id: 'ls-1',
        title: 'The Mediterranean Diet',
        moduleId: 'lifestyle',
        order: 1,
        estimatedMinutes: 6,
        heartPoints: 100,
        content: `
# The Mediterranean Diet for Heart Health

The Mediterranean diet is the most evidence-based eating pattern for cardiovascular prevention. The PREDIMED trial showed it reduced major cardiovascular events by 30%.

## Core Components

### Daily
- 3-4 tablespoons extra virgin olive oil
- 1 handful nuts (almonds, walnuts)
- 5+ servings fruits and vegetables
- Whole grains (brown rice, quinoa, whole wheat)
- Legumes (beans, lentils, chickpeas)

### Weekly
- Fish (3+ servings, especially fatty fish like salmon)
- Poultry (moderate amounts)
- Eggs (2-4)
- Dairy (moderate, prefer yogurt and cheese)

### Monthly/Limited
- Red meat (rarely)
- Processed foods (avoid)
- Added sugars (limit)
- Butter (replace with olive oil)

## Foods to Emphasize

| Food | Benefit |
|------|---------|
| Olive oil | Monounsaturated fats, polyphenols |
| Salmon | Omega-3 fatty acids |
| Walnuts | ALA omega-3, fiber |
| Blueberries | Anthocyanins (antioxidants) |
| Oats | Beta-glucan (lowers LDL) |
| Spinach | Nitrates (improve blood flow) |
| Garlic | May lower blood pressure |

## Foods to Limit

- Trans fats (eliminate completely)
- Saturated fats (under 10% of calories)
- Sodium (under 2,000mg for hypertension patients)
- Added sugars (under 25g/day)
- Processed meats (bacon, sausage, deli meats)
        `,
        quiz: {
          id: 'ls-1-quiz',
          passingScore: 70,
          questions: [
            {
              id: 'q1',
              question:
                'By what percentage did the Mediterranean diet reduce cardiovascular events in the PREDIMED trial?',
              options: ['10%', '20%', '30%', '40%'],
              correctIndex: 2,
              explanation:
                'The PREDIMED trial showed the Mediterranean diet reduced major cardiovascular events by 30% in high-risk patients.',
            },
            {
              id: 'q2',
              question: 'Which type of fat should be eliminated completely?',
              options: ['Monounsaturated', 'Polyunsaturated', 'Saturated', 'Trans fats'],
              correctIndex: 3,
              explanation:
                'Trans fats should be completely eliminated from the diet as they raise LDL and lower HDL.',
            },
            {
              id: 'q3',
              question: 'How many servings of fish are recommended per week?',
              options: ['1', '2', '3+', '5+'],
              correctIndex: 2,
              explanation:
                'The Mediterranean diet recommends 3 or more servings of fish per week, especially fatty fish.',
            },
          ],
        },
      },
    ],
  },
];

export function getModuleById(id: string): Module | undefined {
  return ACADEMY_MODULES.find((m) => m.id === id);
}

export function getLessonById(id: string): Lesson | undefined {
  for (const mod of ACADEMY_MODULES) {
    const lesson = mod.lessons.find((l) => l.id === id);
    if (lesson) return lesson;
  }
  return undefined;
}

export function getTotalHeartPoints(): number {
  return ACADEMY_MODULES.reduce((sum, m) => sum + m.totalHeartPoints, 0);
}
