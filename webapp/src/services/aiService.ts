import { auth } from '../lib/firebase';

// All Gemini calls happen server-side (see src/server/aiRoutes.ts) — the
// API key must never be bundled into client-side code. Each function here
// just forwards to an authenticated API route and keeps the same shape
// callers already expect.

async function callAiRoute(path: string, body: unknown) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not signed in');

  const response = await fetch(`/api/ai/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`AI route ${path} failed: ${response.status}`);
  }
  return response.json();
}

export async function cleanSiteNote(note: string) {
  try {
    const { text } = await callAiRoute('clean-site-note', { note });
    return text || note;
  } catch (error) {
    console.error('AI cleanSiteNote error:', error);
    return note;
  }
}

export async function generateValuationAnalysis(boq: any[], fieldProgress: any[], contractType: string) {
  try {
    const { text } = await callAiRoute('valuation-analysis', { boq, fieldProgress, contractType });
    return text || 'Failed to generate AI analysis.';
  } catch (error) {
    console.error('AI generateValuationAnalysis error:', error);
    return 'Failed to generate AI analysis.';
  }
}

export async function analyzeSitePhoto(imageBase64: string): Promise<string[]> {
  try {
    const { tags } = await callAiRoute('analyze-photo', { imageBase64 });
    return tags || [];
  } catch (error) {
    console.error('Photo analysis failed:', error);
    return ['SITE OBSERVATION', 'ARCHIVE'];
  }
}

export async function extractMaterialDocketInfo(imageBase64: string, existingMaterials: any[]): Promise<{ name: string, quantity: number, unit: string } | null> {
  try {
    return await callAiRoute('extract-docket', { imageBase64, existingMaterials });
  } catch (error) {
    console.error('Docket analysis failed:', error);
    return null;
  }
}

export async function generateStakeholderMindMap(stakeholders: any[], projectName: string) {
  try {
    return await callAiRoute('stakeholder-mindmap', { stakeholders, projectName });
  } catch (error) {
    console.error('AI Mind Map generation failed:', error);
    return { name: projectName, children: [] };
  }
}

export async function generateAiTasks(context: string) {
  const { tasks } = await callAiRoute('generate-tasks', { context });
  return tasks;
}

export async function extractBaselineMilestones(programText: string) {
  const { milestones } = await callAiRoute('extract-baseline-milestones', { programText });
  return milestones;
}

export async function analyzeProgramAlignment(milestones: any[], weatherSummary: string, diarySummary: string) {
  const { text } = await callAiRoute('analyze-program-alignment', { milestones, weatherSummary, diarySummary });
  return text;
}

export async function pdfTakeoff(imageBase64: string) {
  const { text } = await callAiRoute('pdf-takeoff', { imageBase64 });
  return text;
}

export async function analyzeDrawing(imageBase64: string) {
  const { text } = await callAiRoute('analyze-drawing', { imageBase64 });
  return text;
}

export async function generateComplianceChecklist(location: string) {
  const { items } = await callAiRoute('compliance-checklist', { location });
  return items;
}

export async function weatherImpactSummary(projectId: string, logData: any[]) {
  const { text } = await callAiRoute('weather-impact-summary', { projectId, logData });
  return text;
}
