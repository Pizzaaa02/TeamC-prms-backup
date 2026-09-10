import { prisma } from '../../db';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const LOGOS_DIR = path.join(__dirname, '..', '..', '..', 'public', 'images');
fs.mkdirSync(LOGOS_DIR, { recursive: true });

export class CustomizerService {
  async getConfig() {
    let config = await (prisma as any).websiteCustomizer.findFirst();
    if (!config) {
      config = await (prisma as any).websiteCustomizer.create({
        data: {
          company_name: 'PRMS',
          light_header_bg: '#ffffff',
          light_sidebar_bg: '#ffffff',
          light_body_bg: '#f9fafb',
          light_footer_bg: '#111827',
          light_accent_color: '#2563eb',
          light_card_bg: '#ffffff',
          dark_header_bg: '#1f2937',
          dark_sidebar_bg: '#1f2937',
          dark_body_bg: '#111827',
          dark_footer_bg: '#030712',
          dark_accent_color: '#60a5fa',
          dark_card_bg: '#334155',
          active_theme: 'light',
        },
      });
    }
    return config;
  }

  async updateConfig(data: Record<string, string | null>) {
    const config = await this.getConfig();
    return (prisma as any).websiteCustomizer.update({
      where: { id: config.id },
      data,
    });
  }

  async uploadLogo(buffer: Buffer, originalname: string) {
    const config = await this.getConfig();

    // Delete old files
    const safeDel = (url: string | null) => {
      if (url) {
        const p = path.join(LOGOS_DIR, path.basename(url));
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    };
    safeDel(config.logo_url);
    safeDel(config.logo_thumb_url);

    const ext = path.extname(originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext) ? ext : '.png';
    const filename = `logo-${Date.now()}${safeExt}`;
    const thumbName = `logo-thumb-${Date.now()}.webp`;
    const filePath = path.join(LOGOS_DIR, filename);
    const thumbPath = path.join(LOGOS_DIR, thumbName);

    fs.writeFileSync(filePath, buffer);

    let thumbUrl: string | null = `/images/${filename}`;
    try {
      await sharp(filePath)
        .resize(128, 128, { fit: 'cover', position: 'centre' })
        .webp({ quality: 80 })
        .toFile(thumbPath);
      thumbUrl = `/images/${thumbName}`;
    } catch { /* fallback to original */ }

    return this.updateConfig({
      logo_url: `/images/${filename}`,
      logo_thumb_url: thumbUrl,
    });
  }

  async removeLogo() {
    const config = await this.getConfig();
    const safeDel = (url: string | null) => {
      if (url) {
        const p = path.join(LOGOS_DIR, path.basename(url));
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    };
    safeDel(config.logo_url);
    safeDel(config.logo_thumb_url);
    return this.updateConfig({
      logo_url: null,
      logo_thumb_url: null,
    });
  }
}
