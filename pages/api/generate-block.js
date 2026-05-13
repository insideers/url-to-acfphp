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
- background_video o background_image → aplícalos como style en la <section>
- Dos botones → renderiza ambos dentro del mismo button-container
- number/stat fields → renderízalos con su label correspondiente

Responde usando EXACTAMENTE este formato con las etiquetas XML:

<acf_json>
{ ...JSON del field group aquí... }
</acf_json>

<php>
<?php ...código PHP aquí... ?>
</php>`
      }]
    });

    const raw = response.content[0].text;

    // Extract using XML tags — avoids all JSON escaping issues with PHP code
    const acfMatch = raw.match(/<acf_json>\s*([\s\S]*?)\s*<\/acf_json>/);
    const phpMatch = raw.match(/<php>\s*([\s\S]*?)\s*<\/php>/);

    if (!acfMatch || !phpMatch) {
      throw new Error('Respuesta del modelo con formato inesperado');
    }

    let acf_json;
    try {
      acf_json = JSON.parse(acfMatch[1].trim());
    } catch (e) {
      throw new Error(`ACF JSON inválido: ${e.message}`);
    }

    const blockData = { acf_json, php: phpMatch[1].trim() };

    res.json(blockData);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Error generando el bloque' });
  }
}
