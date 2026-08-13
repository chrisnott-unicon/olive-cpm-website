import { Router } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import admin from 'firebase-admin';

// Server-only: GEMINI_API_KEY must never be read in client-side code or
// passed through Vite's `define`. It's only ever used here, inside a
// request handler that runs on the server.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const router = Router();

// Every route below touches the Gemini API, which is billed per-request.
// Require a valid Firebase ID token so this isn't an open proxy anyone on
// the internet can use to burn the project's quota.
router.use(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }
  try {
    await admin.auth().verifyIdToken(token);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

router.post('/clean-site-note', async (req, res) => {
  const { note } = req.body || {};
  if (typeof note !== 'string' || !note.trim()) {
    res.status(400).json({ error: 'note is required' });
    return;
  }
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a high-level site management consultant specializing in Principal Agent governance.
  Take the following raw site observation and transform it into a professional, legally-defensible Daily Record of Operations (Cl. 4.22 equivalent).
  Use industry-standard terminology consistent with JBCC, GCC, NEC, and FIDIC frameworks.
  Ensure a objective tone, focusing on:
  1. Resource Allocation & Site Occupancy
  2. Construction Milestones & Delays (Cl. 15.0 context)
  3. Instructions Received/Given
  4. Environmental/Weather Impact

  Observation: "${note}"`,
    });
    res.json({ text: response.text || note });
  } catch (error) {
    console.error('AI cleanSiteNote error:', error);
    res.json({ text: note });
  }
});

router.post('/valuation-analysis', async (req, res) => {
  const { boq, fieldProgress, contractType } = req.body || {};
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert construction Quantity Surveyor and Chartered Arbitrator.
  Analyze the provided Bill of Quantities (BOQ) and Daily Site Record data.
  Synthesize a professional Interim Progress Claim Analysis conforming strictly to ${contractType} standards.

  Requirements:
  - Formulate as a recommendation for the Principal Agent / Engineer.
  - Detail Gross Value of Work Executed to Date.
  - Specify Retention Withheld (reference Clause context).
  - Comment on Site Occupancy and Program Alignment (Contract duration).

  BOQ Matrix: ${JSON.stringify(boq)}
  Site Log Context: ${JSON.stringify(fieldProgress)}`,
    });
    res.json({ text: response.text || 'Failed to generate AI analysis.' });
  } catch (error) {
    console.error('AI generateValuationAnalysis error:', error);
    res.json({ text: 'Failed to generate AI analysis.' });
  }
});

router.post('/analyze-photo', async (req, res) => {
  const { imageBase64 } = req.body || {};
  if (typeof imageBase64 !== 'string' || !imageBase64) {
    res.status(400).json({ error: 'imageBase64 is required' });
    return;
  }
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          text: `You are a professional construction site inspector. Analyze this site photo and provide a concise list of architectural and construction tags (max 8).
          Focus on identifying:
          - Materials (e.g., concrete, steel, brickwork)
          - Structural elements (e.g., slab, column, trusses)
          - Site conditions (e.g., foundation phase, roofing, finishing)
          - Specific equipment or plant visible.

          Return only a comma-separated list of tags.`,
        },
        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
      ],
    });
    const tags = response.text?.split(',').map((tag) => tag.trim().toUpperCase()) || [];
    res.json({ tags: tags.filter((tag) => tag.length > 0) });
  } catch (error) {
    console.error('Photo analysis failed:', error);
    res.json({ tags: ['SITE OBSERVATION', 'ARCHIVE'] });
  }
});

router.post('/extract-docket', async (req, res) => {
  const { imageBase64, existingMaterials } = req.body || {};
  if (typeof imageBase64 !== 'string' || !imageBase64) {
    res.status(400).json({ error: 'imageBase64 is required' });
    return;
  }
  try {
    const listDescriptions = (existingMaterials || []).map((m: any) => m.name).join(', ');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          text: `You are an expert Quantity Surveyor reviewing a delivery docket/receipt.
          Extract the primary material delivered and its quantity.
          Match the material name to one of these existing ledger items if possible: [${listDescriptions}].
          Return ONLY a valid JSON object in this format, with no extra text or markdown:
          {"name": "Matched or Found Material Name", "quantity": 10.5, "unit": "tons"}`,
        },
        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
      ],
    });
    const text = response.text || '{}';
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    res.json(JSON.parse(jsonStr));
  } catch (error) {
    console.error('Docket analysis failed:', error);
    res.json(null);
  }
});

router.post('/stakeholder-mindmap', async (req, res) => {
  const { stakeholders, projectName } = req.body || {};
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a strategic project management consultant. Create a comprehensive Stakeholder Relationship Mind Map for the construction project: "${projectName}".

      Based on the following stakeholder list, organize them into a hierarchical/relational structure (Central Project -> Categories -> Stakeholders).

      Stakeholder List: ${JSON.stringify(stakeholders)}

      Output MUST be a valid JSON object with the following structure for a D3 tree/graph:
      {
        "name": "${projectName}",
        "children": [
          {
            "name": "Consultants",
            "children": [...]
          },
          ...
        ]
      }

      Categorize stakeholders logically (e.g., Client Body, Design Consultants, Engineering Team, Contractors, Sub-Contractors).
      Include the stakeholder's role in their node name.
      Return ONLY the JSON object.`,
    });
    const text = response.text || '{}';
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    res.json(JSON.parse(jsonStr));
  } catch (error) {
    console.error('AI Mind Map generation failed:', error);
    res.json({ name: projectName, children: [] });
  }
});

router.post('/generate-tasks', async (req, res) => {
  const { context } = req.body || {};
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Review the following architectural drawing log or project data context:
      "${context || 'Standard construction project lifecycle'}"

      Extract or infer 5-8 critical tasks, milestones, and professional dependencies.`,
      config: {
        systemInstruction: 'You are a senior construction project manager for Olive CPM. Your goal is to convert unstructured project data (like drawing logs or schedules) into a structured task matrix. Ensure priority reflects the complexity of construction operations. Milestone status should be reserved only for critical handovers or sign-offs.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Professional, concise task name' },
              description: { type: Type.STRING, description: 'Technical context or requirement' },
              priority: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Critical'] },
              isMilestone: { type: Type.BOOLEAN },
              suggestedDueDaysFromNow: { type: Type.NUMBER },
            },
            required: ['title', 'description', 'priority', 'isMilestone', 'suggestedDueDaysFromNow'],
          },
        },
      },
    });
    res.json({ tasks: JSON.parse(response.text || '[]') });
  } catch (error) {
    console.error('AI generateAiTasks error:', error);
    res.status(500).json({ error: 'AI task generation failed' });
  }
});

router.post('/extract-baseline-milestones', async (req, res) => {
  const { programText } = req.body || {};
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the following construction program text extracted from a PDF.
        Extract a comprehensive list of key tasks/milestones.
        For each item, identify:
        1. "task" (title)
        2. "baselineFinish" (finish date)
        3. "duration" (days/weeks if mentioned)
        4. "dependencies" (predecessor tasks if identifiable)
        5. "weight" (relative importance 1-10)

        PROGRAM TEXT:
        ${(programText || '').substring(0, 8000)}

        Return ONLY a JSON array of objects.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              task: { type: Type.STRING },
              baselineFinish: { type: Type.STRING },
              duration: { type: Type.STRING },
              dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
              weight: { type: Type.NUMBER },
            },
            required: ['task', 'baselineFinish'],
          },
        },
      },
    });
    res.json({ milestones: JSON.parse(response.text || '[]') });
  } catch (error) {
    console.error('AI extractBaselineMilestones error:', error);
    res.status(500).json({ error: 'Baseline extraction failed' });
  }
});

router.post('/analyze-program-alignment', async (req, res) => {
  const { milestones, weatherSummary, diarySummary } = req.body || {};
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a professional construction planner and delay analyst.
      Analyze the alignment between the Baseline Programme and actual Site Performance.

      BASELINE MILESTONES:
      ${JSON.stringify(milestones)}

      RECENT WEATHER DATA (Last 30 entries):
      ${weatherSummary}

      RECENT SITE DIARY LOGS:
      ${diarySummary}

      TASK:
      1. Predict potential slippage for the upcoming milestones.
      2. Identify specific risks (e.g., weather delays impacting exterior work, labor shortages noted in diaries).
      3. Suggest contractual mitigation strategies (e.g., Clause 10.1 force majeure notice if applicable).

      FORMAT: Return a structured analysis with "Executive Summary", "Slippage Projections", and "Risk Mitigation". Use clear professional tone.`,
    });
    res.json({ text: response.text || 'Analysis pending.' });
  } catch (error) {
    console.error('AI analyzeProgramAlignment error:', error);
    res.status(500).json({ error: 'Program alignment analysis failed' });
  }
});

router.post('/pdf-takeoff', async (req, res) => {
  const { imageBase64 } = req.body || {};
  if (typeof imageBase64 !== 'string' || !imageBase64) {
    res.status(400).json({ error: 'imageBase64 is required' });
    return;
  }
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
            { text: 'Perform a material takeoff based on this architectural drawing. Estimate quantities for concrete, steel, drywall, or relevant materials you can identify. Respond with a concise text report.' },
          ],
        },
      ],
    });
    res.json({ text: response.text });
  } catch (error) {
    console.error('AI pdfTakeoff error:', error);
    res.status(500).json({ error: 'Takeoff report generation failed' });
  }
});

router.post('/analyze-drawing', async (req, res) => {
  const { imageBase64 } = req.body || {};
  if (typeof imageBase64 !== 'string' || !imageBase64) {
    res.status(400).json({ error: 'imageBase64 is required' });
    return;
  }
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
            { text: 'Analyze this architectural drawing. Extract: 1. Sheet Title 2. Sheet Number 3. Revision number 4. Provide a very brief summary of what this drawing shows. Provide response in strict JSON format: { "title": "...", "number": "...", "revision": "...", "summary": "..." }' },
          ],
        },
      ],
    });
    res.json({ text: response.text });
  } catch (error) {
    console.error('AI analyzeDrawing error:', error);
    res.status(500).json({ error: 'Drawing analysis failed' });
  }
});

router.post('/compliance-checklist', async (req, res) => {
  const { location } = req.body || {};
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a JSON array of 5 crucial statutory compliance items required for a construction project located in ${location || 'South Africa'}. Each item should have: "title" (string), "description" (string), "category" (enum: "Health_Safety", "Environmental", "Labour", "Quality", "General"). Return ONLY valid JSON array.`,
    });
    const cleanJson = (response.text || '[]').replace(/```json/g, '').replace(/```/g, '');
    res.json({ items: JSON.parse(cleanJson) });
  } catch (error) {
    console.error('AI complianceChecklist error:', error);
    res.status(500).json({ error: 'Compliance checklist generation failed' });
  }
});

router.post('/weather-impact-summary', async (req, res) => {
  const { projectId, logData } = req.body || {};
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Act as a Senior Site Engineer. Analyze the last 24 hours of site weather data for Project ${projectId}:
      ${JSON.stringify(logData)}

      Provide a "Weather Impact Report" focusing on:
      1. CRITICAL PATH IMPACTS: Identify specific delays to tower cranes (if wind > 40km/h), concrete works (if temp < 5°C or rain), and earthworks.
      2. WORKABILITY WINDOWS: When was the site most productive?
      3. STANDING TIME: Quantify potential lost hours based on inclement weather.
      4. SUMMARY: One paragraph executive summary.
      5. RISK RATING: Assign a rating of [LOW, MODERATE, HIGH] for continuity.

      Maintain a technical, data-driven AEC (Architecture, Engineering, Construction) industry tone.`,
    });
    res.json({ text: response.text || 'Summary analysis not available.' });
  } catch (error) {
    console.error('AI weatherImpactSummary error:', error);
    res.status(500).json({ error: 'Weather impact summary failed' });
  }
});

export default router;
