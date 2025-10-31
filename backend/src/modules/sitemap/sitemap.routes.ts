import { Router } from "express";
import * as sitemapController from "./sitemap.controller";

/**
 * Rutas públicas para sitemap
 * GET /sitemap.xml - Devuelve el sitemap dinámico
 * 
 * Justificación REST API Design:
 * - Endpoint público (no requiere autenticación)
 * - Responde con XML estándar sitemap protocol
 */
const sitemapRoutes: Router = Router();

sitemapRoutes.get('/sitemap.xml', sitemapController.getSitemap);

export default sitemapRoutes;
