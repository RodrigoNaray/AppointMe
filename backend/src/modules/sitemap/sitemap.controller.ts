import { Request, Response } from "express";
import { generateSitemapXml } from "./sitemap.service";
import logger from "../../utils/logger";

/**
 * Controller para servir el sitemap.xml
 * GET /sitemap.xml
 * 
 * Justificación Google SEO Best Practices:
 * - Content-Type: application/xml (obligatorio)
 * - Cache-Control: permite cacheo por 1 hora (reduce carga servidor)
 * - Status 200 para éxito, 500 para errores
 * 
 * Justificación OWASP A09:2021 (Security Logging):
 * - Loguear errores sin exponer información sensible
 */
export async function getSitemap(req: Request, res: Response): Promise<void> {
  try {
    // Reutilizar CLIENT_URL (ya existe) en lugar de PUBLIC_DOMAIN
    // Ambas variables apuntan al mismo dominio del frontend
    const baseUrl = process.env.CLIENT_URL || 'https://appointmepro.me';

    // Generar sitemap dinámicamente
    const xml = await generateSitemapXml(baseUrl);

    // Configurar headers apropiados
    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=3600'); // Cache 1 hora

    // Enviar XML
    res.status(200).send(xml);
  } catch (error) {
    logger.error({ error }, 'Error generando sitemap');
    
    // No exponer detalles del error al cliente (OWASP)
    res.status(500).header('Content-Type', 'text/plain').send('Error al generar el sitemap');
  }
}
