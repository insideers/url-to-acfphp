# Web → ACF + PHP Agent

Agente que analiza cualquier web y genera automáticamente los bloques PHP y JSON de ACF para WordPress, siguiendo tu arquitectura exacta.

## Cómo funciona

1. Introduces una URL (+ capturas opcionales si la web bloquea el acceso)
2. Claude analiza la web con web search server-side y detecta todas las secciones
3. Por cada sección genera:
   - **JSON de ACF** con el field group completo listo para importar
   - **PHP del bloque** siguiendo tu estilo exacto (BEM, get_sub_field, condicionales, etc.)

## Deploy en Vercel

### 1. Sube el proyecto

```bash
# Opción A: GitHub
git init && git add . && git commit -m "init" && git push

# Opción B: Vercel CLI
npm i -g vercel
vercel
```

### 2. Variables de entorno en Vercel

En el dashboard de Vercel → tu proyecto → Settings → Environment Variables:

| Variable | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |

### 3. Redespliega

Después de añadir la variable, haz redeploy para que se aplique.

## Desarrollo local

```bash
npm install

# Crea .env.local
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local

npm run dev
# → http://localhost:3000
```

## Notas

- El web search funciona server-side (Vercel functions), no en el navegador
- Si una web bloquea el acceso, sube capturas de pantalla de las secciones
- Cada bloque se genera de forma independiente — si uno falla, los demás siguen
