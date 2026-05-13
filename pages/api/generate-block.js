import Anthropic from '@anthropic-ai/sdk';
import { PHP_EXAMPLES, GENERATE_SYSTEM } from '../../lib/architecture';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function createWithRetry(params, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await client.messages.create(params);
    } catch (err) {
      const is429 = err?.status === 429 || err?.message?.includes('429');
      if (is429 && i < retries - 1) {
        const wait = (i + 1) * 15000; // 15s, 30s, 45s
        console.log(`Rate limit hit, waiting ${wait/1000}s...`);
        await sleep(wait);
      } else {
        throw err;
      }
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { section, includeContent, includeComments } = req.body;

  if (!section) return res.status(400).json({ error: 'Falta la sección' });

  try {
    const response = await createWithRetry({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: GENERATE_SYSTEM + '\n\n' + PHP_EXAMPLES,
      messages: [{
        role: 'user',
        content: `Genera el JSON de ACF y el PHP para esta sección WordPress:

${JSON.stringify(section, null, 2)}

REGLAS CRÍTICAS:
- Genera un campo ACF por CADA elemento en "fields" — no omitas ninguno
- El PHP debe renderizar CADA campo de "fields" — no te dejes ninguno
- Keys únicas: "group_" + 8 hex random y "field_" + 8 hex random
- Sin comentarios PHP
- hasRepeater=true → while(have_rows(repeaterField)) con todos los sub_fields
- Post objects → foreach + setup_postdata + wp_reset_postdata
- background_video o background_image → aplícalos como atributo style o src en la <section> o wrapper
- Dos botones (button_text + button_2_text) → renderiza ambos dentro del mismo button-container
- number/stat fields → renderízalos con su label correspondiente

FORMATO DE RESPUESTA — MUY IMPORTANTE:
El valor de "php" debe ser un string JSON válido. Usa \\n para saltos de línea y \\" para comillas dentro del PHP.
Devuelve SOLO este JSON sin markdown ni bloques de código:
{"acf_json": {...}, "php": "<?php ... código PHP con \\n para saltos de línea ..."}`
      }]
    });

    const raw = response.content[0].text;
    let blockData;

    // Clean markdown fences
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      blockData = JSON.parse(clean);
    } catch (e) {
      // Try to extract acf_json and php separately with regex
      // since PHP content with quotes often breaks standard JSON.parse
      try {
        const acfMatch = clean.match(/"acf_json"\s*:\s*(\{[\s\S]*?\})\s*,\s*"php"/);
        const phpMatch = clean.match(/"php"\s*:\s*"([\s\S]*?)"\s*\}?\s*$/);

        if (acfMatch && phpMatch) {
          blockData = {
            acf_json: JSON.parse(acfMatch[1]),
            php: phpMatch[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"')
          };
        } else {
          // Last resort: ask Claude to fix the JSON
          const fixRes = await createWithRetry({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 3000,
            system: 'Eres un experto en JSON. Devuelve SOLO el JSON corregido y válido, sin markdown.',
            messages: [{
              role: 'user',
              content: `Este JSON está mal formateado, corrígelo. El campo "php" debe tener el código PHP como string con escapes correctos (\\n para saltos, \\" para comillas dentro del string):\n\n${clean}`
            }]
          });
          const fixedClean = fixRes.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          blockData = JSON.parse(fixedClean);
        }
      } catch (e2) {
        throw new Error(`No se pudo parsear la respuesta del bloque: ${e2.message}`);
      }
    }

    res.json(blockData);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Error generando el bloque' });
  }
}
