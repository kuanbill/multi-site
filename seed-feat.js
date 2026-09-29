const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
(async () => {
  const p = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL }) });
  const defs = [
    { key: 'pages', label: '頁面管理', icon: '📄', path: 'pages', isSystem: true },
    { key: 'posts', label: '文章/公告', icon: '📝', path: 'posts', isSystem: true },
    { key: 'media', label: '媒體庫', icon: '🖼️', path: 'media', isSystem: true },
    { key: 'faq', label: '常見問題', icon: '❓', path: 'faq', isSystem: false },
    { key: 'timeline', label: '時程進度', icon: '📅', path: 'timeline', isSystem: false },
    { key: 'contact', label: '聯絡表單', icon: '✉️', path: 'contact', isSystem: false },
  ];
  for (const d of defs) {
    await p.featureDefinition.upsert({ where: { key: d.key }, update: {}, create: d });
    console.log('upsert', d.key);
  }
  const all = await p.featureDefinition.findMany();
  console.log('all', all.length);
  const sites = await p.site.findMany();
  console.log('sites', sites.length);
  for (const s of sites) {
    for (let i = 0; i < all.length; i++) {
      const def = all[i];
      const en = ['pages', 'posts', 'media'].includes(def.key);
      await p.siteFeature.upsert({
        where: { siteId_featureId: { siteId: s.id, featureId: def.id } },
        update: {},
        create: { siteId: s.id, featureId: def.id, enabled: en, sortOrder: i },
      });
      console.log('siteFeature', s.slug, def.key, en);
    }
  }
  console.log('done');
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
