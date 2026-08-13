import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function cleanSiteNote(note: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    return response.text || note;
  } catch (error) {
    console.error("AI cleanSiteNote error:", error);
    return note;
  }
}

export async function generateValuationAnalysis(boq: any[], fieldProgress: any[], contractType: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    return response.text || "Failed to generate AI analysis.";
  } catch (error) {
    console.error("AI generateValuationAnalysis error:", error);
    return "Failed to generate AI analysis.";
  }
}

export async function analyzeSitePhoto(imageBase64: string): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64,
          },
        },
      ],
    });
    const tags = response.text?.split(',').map(tag => tag.trim().toUpperCase()) || [];
    return tags.filter(tag => tag.length > 0);
  } catch (error) {
    console.error("Photo analysis failed:", error);
    return ['SITE OBSERVATION', 'ARCHIVE'];
  }
}

export async function extractMaterialDocketInfo(imageBase64: string, existingMaterials: any[]): Promise<{ name: string, quantity: number, unit: string } | null> {
  try {
    const listDescriptions = existingMaterials.map(m => m.name).join(", ");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          text: `You are an expert Quantity Surveyor reviewing a delivery docket/receipt.
          Extract the primary material delivered and its quantity.
          Match the material name to one of these existing ledger items if possible: [${listDescriptions}].
          Return ONLY a valid JSON object in this format, with no extra text or markdown:
          {"name": "Matched or Found Material Name", "quantity": 10.5, "unit": "tons"}`,
        },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64,
          },
        },
      ],
    });
    
    const text = response.text || "{}";
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Docket analysis failed:", error);
    return null;
  }
}

export async function generateStakeholderMindMap(stakeholders: any[], projectName: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    
    const text = response.text || "{}";
    // Clean up potential markdown formatting
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Mind Map generation failed:", error);
    return { name: projectName, children: [] };
  }
}
