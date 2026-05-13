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

Devuelve SOLO este JSON sin markdown:
{"acf_json": {...}, "php": "código PHP completo"}`
      }]
    });

    const raw = response.content[0].text;
    let blockData;
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      blockData = JSON.parse(clean);
    } catch (e) {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { blockData = JSON.parse(match[0]); }
        catch (e2) { throw new Error('No se pudo parsear la respuesta del bloque'); }
      } else {
        throw new Error('Respuesta inesperada del modelo');
      }
    }

    res.json(blockData);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Error generando el bloque' });
  }
}
