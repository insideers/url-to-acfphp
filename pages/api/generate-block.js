import Anthropic from '@anthropic-ai/sdk';
import { PHP_EXAMPLES, GENERATE_SYSTEM } from '../../lib/architecture';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { section, includeContent, includeComments } = req.body;

  if (!section) return res.status(400).json({ error: 'Falta la sección' });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: GENERATE_SYSTEM,
      messages: [{
        role: 'user',
        content: `Genera el JSON de ACF y el archivo PHP para este bloque WordPress:

SECCIÓN: ${JSON.stringify(section, null, 2)}

${PHP_EXAMPLES}

INSTRUCCIONES:
- Sigue EXACTAMENTE el estilo PHP de los ejemplos (BEM, get_sub_field, condicionales, clases helper)
- El JSON ACF debe tener keys únicas: "group_" + 8 chars hex random y "field_" + 8 chars hex random
${includeContent ? '- En los comentarios PHP menciona los textos reales de sampleContent como referencia' : ''}
${includeComments ? '- Añade comentarios PHP breves y útiles donde aporten valor' : '- Sin comentarios PHP'}
- Si hasRepeater es true, usa while(have_rows()) exactamente como en el ejemplo de faqs
- Si la sección tiene post objects (testimonials, etc.), usa foreach + setup_postdata + wp_reset_postdata
- Para galerías de logos usa foreach sobre el array de imágenes
- Nombra el archivo PHP igual que el slug de la sección

Devuelve SOLO este JSON (sin markdown, sin bloques de código):
{
  "acf_json": { ...field group completo con todas las propiedades requeridas... },
  "php": "código PHP completo del bloque como string"
}`
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
