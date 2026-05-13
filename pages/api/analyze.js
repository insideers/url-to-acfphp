import Anthropic from '@anthropic-ai/sdk';
import { PHP_EXAMPLES, DETECT_SYSTEM } from '../../lib/architecture';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { url, context, images } = req.body;

  if (!url && (!images || images.length === 0)) {
    return res.status(400).json({ error: 'Se necesita una URL o capturas de pantalla' });
  }

  try {
    let webContent = '';

    // Step 1: fetch web content via web_search tool (server-side only)
    if (url) {
      try {
        const searchRes = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{
            role: 'user',
            content: `Visita y analiza exhaustivamente esta web: ${url}

Describe con detalle TODAS las secciones de la página:
- Tipo de sección (hero, features, testimonials, pricing, FAQ, logo row, stats, CTA, banner, contact, etc.)
- Textos reales visibles (títulos, subtítulos, bodycopy, labels de botones)
- Estructura de cada sección (¿tiene imagen? ¿lista de items? ¿repeater de tarjetas? ¿formulario?)
- Campos de contenido necesarios para cada sección

Sé muy exhaustivo y detallado.`
          }]
        });

        webContent = searchRes.content
          .map(b => b.type === 'text' ? b.text : '')
          .filter(Boolean)
          .join('\n');
      } catch (e) {
        console.error('Web search failed:', e.message);
        webContent = `URL proporcionada: ${url}`;
      }
    }

    // Step 2: detect sections — with images if provided
    const userContent = [];

    if (images && images.length > 0) {
      for (const img of images) {
        userContent.push({
          type: 'image',
          source: { type: 'base64', media_type: img.type, data: img.data }
        });
      }
    }

    userContent.push({
      type: 'text',
      text: `${url ? `Web analizada: ${url}\n` : ''}${webContent ? `\nContenido detectado:\n${webContent}\n` : ''}${context ? `\nContexto del proyecto: ${context}\n` : ''}

Lista TODAS las secciones distintas de esta web. Para cada sección devuelve un JSON array con este formato exacto:
[
  {
    "slug": "hero-shot",
    "title": "Section - Hero Shot",
    "description": "Descripción breve de la sección",
    "fields": [
      {"name": "title", "label": "Title", "type": "text"},
      {"name": "subtitle", "label": "Subtitle", "type": "textarea"},
      {"name": "button_text", "label": "Button Text", "type": "text"},
      {"name": "button_link", "label": "Button Link", "type": "url"},
      {"name": "image", "label": "Image", "type": "image"}
    ],
    "hasRepeater": false,
    "repeaterField": null,
    "repeaterSubFields": null
  }
]

REGLAS IMPORTANTES para los nombres de bloques:
- Usa nombres GENÉRICOS y REUTILIZABLES, no específicos del contenido
- CORRECTO: hero-shot, features, testimonials, logo-row, stats, faq, banner, cta, pricing, team, contact
- INCORRECTO: value-proposition, key-benefits, solar-advantages, product-highlights (demasiado específicos)
- Piensa en el PATRÓN visual/estructural, no en el contenido concreto
- Una sección de "Key Benefits" es estructuralmente un "features" → úsalo
- Una sección de "Why Us" / "Value Proposition" suele ser un "banner" o "features" → elige el más apropiado

Para secciones con listas de items (features, FAQs, testimonials, logos, etc.) usa hasRepeater: true y define repeaterField con el nombre del repeater y repeaterSubFields con sus campos.
SOLO el JSON array, sin markdown ni explicación.`
    });

    const detectRes = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: DETECT_SYSTEM,
      messages: [{ role: 'user', content: userContent }]
    });

    const rawSections = detectRes.content[0].text;
    let sections;
    try {
      const clean = rawSections.replace(/```json|```/g, '').trim();
      sections = JSON.parse(clean);
    } catch (e) {
      const match = rawSections.match(/\[[\s\S]*\]/);
      if (match) sections = JSON.parse(match[0]);
      else throw new Error('No se pudieron parsear las secciones detectadas');
    }

    res.json({ sections, webContent: webContent.slice(0, 500) });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Error analizando la web' });
  }
}
