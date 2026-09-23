import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { hash } from 'bcryptjs'

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  // 建立管理員帳號
  const adminPassword = await hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: '管理員',
      password: adminPassword,
      role: 'admin'
    }
  })

  // 建立編輯者帳號
  const editorPassword = await hash('editor123', 12)
  const editor = await prisma.user.upsert({
    where: { email: 'editor@example.com' },
    update: {},
    create: {
      email: 'editor@example.com',
      name: '編輯者',
      password: editorPassword,
      role: 'editor'
    }
  })

  // 建立範例子網站
  const site1 = await prisma.site.upsert({
    where: { slug: 'zhonghe-renewal' },
    update: {},
    create: {
      name: '中和都更案',
      slug: 'zhonghe-renewal',
      description: '新北市中和區都市更新計畫'
    }
  })

  const site2 = await prisma.site.upsert({
    where: { slug: 'banqiao-renewal' },
    update: {},
    create: {
      name: '板橋都更案',
      slug: 'banqiao-renewal',
      description: '新北市板橋區都市更新計畫'
    }
  })

  // 建立功能定義
  const featureDefs = [
    { key: 'pages', label: '頁面管理', icon: '📄', path: 'pages', description: '靜態頁面', isSystem: true },
    { key: 'posts', label: '文章/公告', icon: '📝', path: 'posts', description: '新聞與公告', isSystem: true },
    { key: 'media', label: '媒體庫', icon: '🖼️', path: 'media', description: '圖片與檔案', isSystem: true },
    { key: 'faq', label: '常見問題', icon: '❓', path: 'faq', description: '常見問題', isSystem: false },
    { key: 'timeline', label: '時程進度', icon: '📅', path: 'timeline', description: '專案時程', isSystem: false },
    { key: 'contact', label: '聯絡表單', icon: '✉️', path: 'contact', description: '聯絡我們', isSystem: false },
  ];
  for (const def of featureDefs) {
    await prisma.featureDefinition.upsert({
      where: { key: def.key },
      update: {},
      create: def,
    });
  }
  const allDefs = await prisma.featureDefinition.findMany();
  const sites = [site1, site2];
  for (const site of sites) {
    for (let i = 0; i < allDefs.length; i++) {
      const def = allDefs[i];
      const enabled = ['pages', 'posts', 'media'].includes(def.key);
      await prisma.siteFeature.upsert({
        where: { siteId_featureId: { siteId: site.id, featureId: def.id } },
        update: {},
        create: { siteId: site.id, featureId: def.id, enabled, sortOrder: i },
      });
    }
  }

  // 清除並重建關聯資料
  await prisma.siteUser.deleteMany()
  await prisma.siteUser.createMany({
    data: [
      { userId: admin.id, siteId: site1.id, role: 'admin' },
      { userId: admin.id, siteId: site2.id, role: 'admin' },
      { userId: editor.id, siteId: site1.id, role: 'editor' }
    ]
  })

  // 清除並重建範例頁面
  await prisma.page.deleteMany()
  await prisma.page.createMany({
    data: [
      { siteId: site1.id, title: '首頁', slug: 'home', content: '<h1>歡迎來到中和都更案</h1>' },
      { siteId: site1.id, title: '關於我們', slug: 'about', content: '<h1>關於中和都更案</h1>' },
      { siteId: site2.id, title: '首頁', slug: 'home', content: '<h1>歡迎來到板橋都更案</h1>' }
    ]
  })

  // 清除並重建範例文章
  await prisma.post.deleteMany()
  await prisma.post.createMany({
    data: [
      { siteId: site1.id, title: '都更進度報告', slug: 'progress-report', content: '<p>本月進度順利</p>', published: true },
      { siteId: site1.id, title: '居民說明會', slug: 'community-meeting', content: '<p>將於下週舉辦</p>', published: false },
      { siteId: site2.id, title: '動工典禮', slug: 'groundbreaking', content: '<p>正式動工</p>', published: true }
    ]
  })

  console.log('種子資料建立完成！')
  console.log('管理員帳號: admin@example.com / admin123')
  console.log('編輯者帳號: editor@example.com / editor123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
