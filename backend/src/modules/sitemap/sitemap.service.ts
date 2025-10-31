import prisma from "../../config/prisma";

/**
 * Interface para definir una URL del sitemap
 */
interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

/**
 * Genera el contenido XML del sitemap dinámicamente
 * @param baseUrl - URL base del sitio (ej: https://appointmepro.me)
 * @returns XML string del sitemap
 * 
 * Justificación Google SEO Best Practices Oct 2025:
 * - UTF-8 encoding obligatorio
 * - URLs absolutas (no relativas)
 * - lastmod en formato ISO 8601
 * - priority y changefreq son hints (Google puede ignorarlos pero ayudan)
 * - Límite 50,000 URLs y 50MB sin comprimir
 */
export async function generateSitemapXml(baseUrl: string): Promise<string> {
  const urls: SitemapUrl[] = [];

  // 1. URLs estáticas principales
  urls.push(
    { loc: `${baseUrl}/`, priority: 1.0, changefreq: 'daily' },
    { loc: `${baseUrl}/book`, priority: 0.9, changefreq: 'daily' },
    { loc: `${baseUrl}/contact`, priority: 0.8, changefreq: 'monthly' },
    { loc: `${baseUrl}/features`, priority: 0.6, changefreq: 'monthly' },
    { loc: `${baseUrl}/login`, priority: 0.5, changefreq: 'monthly' },
    { loc: `${baseUrl}/register`, priority: 0.5, changefreq: 'monthly' }
  );

  // 2. URLs dinámicas: Categorías
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: {
      id: true,
      updatedAt: true,
    },
  });

  categories.forEach((category) => {
    urls.push({
      loc: `${baseUrl}/services?category=${category.id}`,
      lastmod: category.updatedAt.toISOString(),
      priority: 0.7,
      changefreq: 'weekly',
    });
  });

  // 3. URLs dinámicas: Servicios individuales (si existe página de detalle)
  // NOTA: Solo descomentar si implementas ruta /services/:id en frontend
  /*
  const services = await prisma.service.findMany({
    where: { isActive: true },
    select: {
      id: true,
      updatedAt: true,
    },
  });

  services.forEach((service) => {
    urls.push({
      loc: `${baseUrl}/services/${service.id}`,
      lastmod: service.updatedAt.toISOString(),
      priority: 0.6,
      changefreq: 'weekly',
    });
  });
  */

  // 4. Generar XML
  const urlsXml = urls
    .map((url) => {
      return `  <url>
    <loc>${escapeXml(url.loc)}</loc>${url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : ''}${url.changefreq ? `\n    <changefreq>${url.changefreq}</changefreq>` : ''}${url.priority !== undefined ? `\n    <priority>${url.priority.toFixed(1)}</priority>` : ''}
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;

  return xml;
}

/**
 * Escapa caracteres especiales para XML
 * Justificación OWASP A03:2021 (Injection):
 * Prevenir XML injection escapando caracteres especiales
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
