/**
 * Customizer controller for the Website Customizer module.
 *
 * Handles CRUD operations for the five customization elements:
 *  - title
 *  - description
 *  - background_color
 *  - logo_url
 *  - company_name
 */

import { Request, Response, Router } from 'express';
import { authenticate } from '../../middleware/auth';

// ---------- In-memory store ----------

interface CustomizationConfig {
  title: string;
  description: string;
  background_color: string;
  logo_url: string;
  company_name: string;
}

const DEFAULTS: CustomizationConfig = {
  title: 'PRMS',
  description: 'Property Rental Management System',
  background_color: '#F3F6FB',
  logo_url: '',
  company_name: 'Property Rental Management System',
};

let config: CustomizationConfig = { ...DEFAULTS };

// Hex color validation
const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
const URL_RE = /^(https?:\/\/)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[#\w\-._~:\/[\]@!$&'()*+,;=]*)?$/;

// ---------- Validators ----------

function validateField(field: string, value: unknown): string | null {
  if (field === 'title') {
    if (!value || (typeof value === 'string' && !value.trim())) return 'title must not be empty';
    if (typeof value === 'string' && value.length > 128) return 'title must be at most 128 characters';
    return null;
  }
  if (field === 'description') {
    if (value !== undefined && value !== null && typeof value === 'string' && value.length > 512) {
      return 'description must be at most 512 characters';
    }
    return null;
  }
  if (field === 'background_color') {
    if (!HEX_RE.test(String(value))) return 'background_color must be a valid hex colour (e.g. #FFF, #112233)';
    return null;
  }
  if (field === 'logo_url') {
    if (!value || (typeof value === 'string' && !value.trim())) return 'logo_url is required';
    if (!URL_RE.test(String(value))) return 'logo_url must be a valid HTTP(S) URL';
    return null;
  }
  if (field === 'company_name') {
    if (!value || (typeof value === 'string' && !value.trim())) return 'company_name must not be empty';
    if (typeof value === 'string' && value.length > 128) return 'company_name must be at most 128 characters';
    return null;
  }
  return `Unknown field: ${field}`;
}

// ---------- Router setup ----------

const router = Router();
router.use(authenticate);

/** GET the current customization config */
router.get('/', (_req: Request, res: Response) => {
  res.json(config);
});

/** PUT update all customization elements */
router.put('/', (req: Request, res: Response) => {
  const { title, description, background_color, logo_url, company_name } = req.body;

  // Validate each field before applying
  const errors: string[] = [];
  if (title !== undefined) {
    const err = validateField('title', title);
    if (err) errors.push(err);
  }
  if (description !== undefined) {
    const err = validateField('description', description);
    if (err) errors.push(err);
  }
  if (background_color !== undefined) {
    const err = validateField('background_color', background_color);
    if (err) errors.push(err);
  }
  if (logo_url !== undefined) {
    const err = validateField('logo_url', logo_url);
    if (err) errors.push(err);
  }
  if (company_name !== undefined) {
    const err = validateField('company_name', company_name);
    if (err) errors.push(err);
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors, config });
  }

  // Apply updates
  Object.assign(config, {
    title: (title as string) || DEFAULTS.title,
    description: (description as string) || DEFAULTS.description,
    background_color: (background_color as string) || DEFAULTS.background_color,
    logo_url: (logo_url as string) || DEFAULTS.logo_url,
    company_name: (company_name as string) || DEFAULTS.company_name,
  });

  res.json(config);
});

/** PATCH a single customization element */
router.patch('/:field', (req: Request, res: Response) => {
  const { field } = req.params;
  const { value } = req.body;

  if (!value && value !== 0 && value !== false) {
    return res.status(400).json({ error: 'Value is required' });
  }

  const normalizedField = String(field);
  const err = validateField(normalizedField, value);
  if (err) {
    return res.status(400).json({ field, error: err, value });
  }

  const typedField = normalizedField as keyof CustomizationConfig;
  config[typedField] = value;
  res.json({ [field as string]: config[typedField] });
});

/** GET a rendered HTML preview */
router.get('/generate-html', (_req: Request, res: Response) => {
  const { title, description, background_color, logo_url, company_name } = config;
  const logoHtml = logo_url ? `<img src="${logo_url}" alt="${company_name} logo" class="wc-preview-logo" />` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    :root {
      --color-primary: #8a2be2;
      --color-secondary: #6b7280;
      --color-text: #111827;
    }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .header {
      height: 60px;
      background-color: #FFFFFF;
      display: flex;
      align-items: center;
      padding: 0 16px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    }
    .header img {
      max-height: 40px;
      object-fit: contain;
    }
    .brand-name {
      font-weight: 700;
      font-size: 1.25rem;
      color: var(--color-text);
      margin-left: 8px;
    }
    .body {
      flex: 1;
      background-color: ${background_color};
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .content {
      text-align: center;
      max-width: 600px;
    }
    h1 {
      font-size: 2rem;
      color: var(--color-text);
      margin-bottom: 0.5em;
    }
    .description {
      color: var(--color-secondary);
      line-height: 1.6;
      font-size: 1.1rem;
    }
    .footer {
      min-height: 40px;
      background-color: #F3F4F6;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      font-size: 0.85rem;
      color: var(--color-secondary);
    }
  </style>
</head>
<body>
  <header class="header">
    ${logoHtml}
    <span class="brand-name">${title}</span>
  </header>
  <main class="body">
    <div class="content">
      <h1>${title}</h1>
      <p class="description">${description}</p>
    </div>
  </main>
  <footer class="footer">
    <span>&copy; ${new Date().getFullYear()} ${company_name}. All rights reserved.</span>
  </footer>
</body>
</html>`;

  res.set('Content-Type', 'text/html');
  res.send(html);
});

/** POST reset all elements to defaults */
router.post('/reset', (_req: Request, res: Response) => {
  config = { ...DEFAULTS };
  res.json(config);
});

export default router;
