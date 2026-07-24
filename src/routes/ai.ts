/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { collections } from "../server/state";
import { criticalLimiter } from "../server/middleware";
import { logActivity } from "../lib/auditLogger";

export const aiRouter = Router();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

aiRouter.post("/api/ai/extract-listing", criticalLimiter, async (req, res) => {
  const { message } = req.body;
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: "Paste raw WhatsApp seller text to scan with Google AI." });
  }

  try {
    logActivity('Gemini-Engine', 'AI_SCAN_REQUEST', 'AI Pipeline', `Analyzing WhatsApp paragraph text with Gemini 3.5-flash`);

    const systemPrompt = `You are a medical equipment domain architect in West Africa. 
Analyze raw hospital trading text and return a beautifully structured JSON with clean fields:
1. title: Polished, professional product title (clean brand and device model labels, correct case, remove messy phone numbers or dates).
2. Category Name: Match with standard medical categories: 
   "Ultrasound Machines", "X-Ray Equipment", "CT & MRI Accessories", "Laboratory Equipment", "Theatre Equipment", "ICU Equipment", "Patient Monitors", "Hospital Beds & Furniture", "PPE & Consumables", "Syringes & Needles", "Gloves", "Infusion Pumps", "Autoclaves & Sterilizers", "Dental Equipment".
3. brand: Manufacturer (e.g. Mindray, GE Healthcare, Tuttnauer, Sonoscape, Shimadzu). If not specified, set to "Generic" or empty.
4. model: Product model ID.
5. condition: Must be strictly "new", "refurbished", "working_used", "faulty", "parts_only", or "scrap". (Decide based on semantic tags: 'new'/'tear rubber'/'unused' -> "new", 'refurbished' -> "refurbished", 'faulty'/'defect'/'not working' -> "faulty", 'parts'/'for parts' -> "parts_only", 'scrap'/'salvage' -> "scrap", otherwise -> "working_used").
6. price: The estimated total price as a pure number.
7. currency: NGN (Nigerian Naira) or USD (US Dollar). (Naira might be labeled as "₦", "NGN", "M" for million Naira).
8. location_state: Match location to a standard Nigerian state.
9. location_city: Local city/town name where equipment is stored.
10. seller_phone: Handphone or WhatsApp number found in the prompt text.
11. description: Cleaned-up professional clinical description formatted with proper English.
12. missing_fields: String array listing vital fields absent in input (e.g. ['warranty', 'photos', 'transducers', 'backup battery health']).
13. spam_flag: Boolean flag indicating if the text contains high-risk keywords (Western union transfer, fast wiring, double cash overnight schemes etc).
14. spam_reasons: Array of why it was flagged as spam.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Raw Message to parse:\n"${message}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING },
            brand: { type: Type.STRING },
            model: { type: Type.STRING },
            condition: { type: Type.STRING },
            price: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            location_state: { type: Type.STRING },
            location_city: { type: Type.STRING },
            seller_phone: { type: Type.STRING },
            description: { type: Type.STRING },
            missing_fields: { type: Type.ARRAY, items: { type: Type.STRING } },
            spam_flag: { type: Type.BOOLEAN },
            spam_reasons: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "category", "condition", "price", "currency", "location_state", "description"]
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("No output returned from the Gemini modeling node.");
    }

    const structuredData = JSON.parse(outputText);
    logActivity('Gemini-Engine', 'AI_SCAN_SUCCESS', 'AI Pipeline', `Extracted listing product: ${structuredData.title}`);
    res.json(structuredData);
  } catch (err: any) {
    console.error("Gemini failed:", err);
    res.status(500).json({ error: `AI Parser node failed: ${err.message || 'Verification failed. Please check your GEMINI_API_KEY settings.'}` });
  }
});

aiRouter.post("/api/ai/improve-description", criticalLimiter, async (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: "Description is empty" });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Rewrite this medical equipment description to sound highly professional, technical, clean, and organized. List key features to help hospitals make buying decisions:\n\n"${description}"`,
    });
    res.json({ enhanced: response.text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiRouter.post("/api/ai/classify-category", criticalLimiter, async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "Title is empty" });

  try {
    const listLabels = collections.categories.map(c => `"${c.name}" (ID: ${c.id})`).join(', ');
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Identify the single most appropriate medical equipment category for "${title}" from this matching index: [${listLabels}]. Return ONLY the Category ID.`,
    });
    
    const matchedId = response.text?.trim() || 'cat-10';
    res.json({ category_id: matchedId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiRouter.post("/api/ai/detect-duplicate", criticalLimiter, async (req, res) => {
  const { title, details } = req.body;
  if (!title) return res.status(400).json({ error: "Product title is required to test duplicates." });

  try {
    const activeListingsStr = collections.listings.map(l => `- "${l.title}" by ${l.seller_name} located in ${l.state} (Price: ${l.price})`).join('\n');
    
    const prompt = `Assess the risk that the incoming medical product posting is a duplicate of something recently posted. Give a percentage of similarity and a risk comment.
    
    Incoming: "${title}" (${details || ''})
    
    Active database index listings:
    ${activeListingsStr || 'None'}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            similarityPercentage: { type: Type.NUMBER },
            isDuplicate: { type: Type.BOOLEAN },
            matchingOffer: { type: Type.STRING },
            reasons: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["similarityPercentage", "isDuplicate", "reasons"]
        }
      }
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiRouter.post("/api/ai/match-procurement", criticalLimiter, async (req, res) => {
  const { listing_id } = req.body;
  const listing = collections.listings.find(l => l.id === listing_id);
  if (!listing) return res.status(404).json({ error: "Product listing not found" });

  try {
    const rfqsStr = collections.procurementRequests.map(r => `RFQ #${r.id}: "${r.title}". Details: ${r.description}. State: ${r.state}. Budget: ${r.budget}`).join('\n');
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are an AI Hospital Sourcing Agent. Match this newly added medical listing: "${listing.title}" with description "${listing.description}" in state "${listing.state}" and price "${listing.price}".
      
      Compare against these hospital requests currently open in West Africa:
      ${rfqsStr}
      
      Return a JSON array of matched items with score percentages, recommending actions.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              requestId: { type: Type.STRING },
              relevancePercentage: { type: Type.NUMBER },
              matchingJustification: { type: Type.STRING }
            },
            required: ["requestId", "relevancePercentage", "matchingJustification"]
          }
        }
      }
    });

    res.json(JSON.parse(response.text || '[]'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

aiRouter.post("/api/ai/compare-devices", criticalLimiter, async (req, res) => {
  const { devices, facility_context } = req.body;
  if (!devices || !Array.isArray(devices) || devices.length < 2) {
    return res.status(400).json({ error: "Please select at least 2 medical devices to compare." });
  }

  try {
    const facility = facility_context || "General Secondary Hospital / Clinical Facility";
    const deviceSpecsText = devices.map((d: any, idx: number) => {
      return `Device #${idx + 1}: ID: "${d.id}", Title: "${d.title}", Brand: "${d.brand || 'N/A'}", Model: "${d.model || 'N/A'}", Condition: "${d.condition}", Price: ${d.price} ${d.currency || 'NGN'}, Category: "${d.category_name || d.category_id || 'Medical Equipment'}", State: "${d.state || 'Lagos'}", Description: "${d.description || 'N/A'}"`;
    }).join("\n\n");

    const systemInstruction = `You are a Senior Clinical Engineering Specialist & Hospital Procurement Advisor in West Africa with 20+ years of biomedical experience.
Compare the provided medical devices side-by-side for a target facility type: "${facility}".

Provide an authoritative, detailed technical breakdown covering:
1. Executive clinical summary explaining the comparison context.
2. Winning device recommendation and primary justification.
3. Individual device evaluations:
   - clinicalSuitabilityScore (1-100)
   - tco3YearEstimateNaira (Estimated 3-Year Total Cost of Ownership in NGN, including purchase, servicing, consumables)
   - keyPros (3-5 distinct technical/clinical advantages)
   - keyCons (2-4 limitations or operational requirements)
   - powerGridReadiness (Assessment of surge tolerance, UPS necessity, generator friendliness)
   - biomedicalMaintainabilityScore (1-10 rating for local spare parts & engineer serviceability)
   - consumableCostRating ("Low", "Moderate", "High")
4. Head-to-head dimension benchmarks (comparing power resilience, diagnostic accuracy, mobility, maintenance, lease value).
5. Procurement committee recommendations (negotiation tips, spare parts kit to order, escrow safety).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Facility Context: ${facility}\n\nSelected Medical Devices:\n${deviceSpecsText}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            winningDeviceId: { type: Type.STRING },
            winningDeviceTitle: { type: Type.STRING },
            winningReason: { type: Type.STRING },
            deviceEvaluations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  deviceId: { type: Type.STRING },
                  deviceTitle: { type: Type.STRING },
                  clinicalSuitabilityScore: { type: Type.NUMBER },
                  tco3YearEstimateNaira: { type: Type.NUMBER },
                  keyPros: { type: Type.ARRAY, items: { type: Type.STRING } },
                  keyCons: { type: Type.ARRAY, items: { type: Type.STRING } },
                  powerGridReadiness: { type: Type.STRING },
                  biomedicalMaintainabilityScore: { type: Type.NUMBER },
                  consumableCostRating: { type: Type.STRING }
                },
                required: ["deviceId", "deviceTitle", "clinicalSuitabilityScore", "tco3YearEstimateNaira", "keyPros", "keyCons", "powerGridReadiness", "biomedicalMaintainabilityScore", "consumableCostRating"]
              }
            },
            headToHeadGrid: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dimension: { type: Type.STRING },
                  analysis: { type: Type.STRING },
                  bestDeviceTitle: { type: Type.STRING }
                },
                required: ["dimension", "analysis", "bestDeviceTitle"]
              }
            },
            procurementRecommendation: {
              type: Type.OBJECT,
              properties: {
                negotiationAdvice: { type: Type.STRING },
                recommendedSpareParts: { type: Type.ARRAY, items: { type: Type.STRING } },
                escrowSafetyNotes: { type: Type.STRING }
              },
              required: ["negotiationAdvice", "recommendedSpareParts", "escrowSafetyNotes"]
            }
          },
          required: ["executiveSummary", "winningDeviceTitle", "winningReason", "deviceEvaluations", "headToHeadGrid", "procurementRecommendation"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || '{}');
    logActivity('Gemini-Engine', 'AI_COMPARE_SUCCESS', 'AI Comparison', `Generated side-by-side technical comparison for ${devices.length} devices.`);
    res.json(parsedData);
  } catch (err: any) {
    console.error("Comparison AI Error:", err);
    res.status(500).json({ error: `AI Comparison Engine Error: ${err.message || 'Failed to generate comparison analysis.'}` });
  }
});
