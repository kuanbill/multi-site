import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { hash } from 'bcryptjs'
import { CONTENT_FEATURES } from '../src/lib/features'

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

  // 建立子網站內容功能定義；舊功能定義保留在資料庫中供相容路由使用。
  for (const def of CONTENT_FEATURES) {
    await prisma.featureDefinition.upsert({
      where: { key: def.key },
      update: {
        label: def.label,
        icon: def.icon,
        path: def.path,
        isSystem: def.isSystem,
      },
      create: {
        key: def.key,
        label: def.label,
        icon: def.icon,
        path: def.path,
        isSystem: def.isSystem,
      },
    });
  }
  const sites = [site1, site2];
  for (const site of sites) {
    await prisma.siteHome.upsert({
      where: { siteId: site.id },
      update: {},
      create: { siteId: site.id },
    });

    for (let i = 0; i < CONTENT_FEATURES.length; i++) {
      const def = CONTENT_FEATURES[i];
      const feature = await prisma.featureDefinition.findUniqueOrThrow({ where: { key: def.key } });
      await prisma.siteFeature.upsert({
        where: { siteId_featureId: { siteId: site.id, featureId: feature.id } },
        update: {},
        create: {
          siteId: site.id,
          featureId: feature.id,
          enabled: true,
          sortOrder: i,
          visibility: def.defaultVisibility,
        },
      });
    }
  }

  // 只補上缺少的關聯，不覆蓋既有成員設定。
  for (const membership of [
    { userId: admin.id, siteId: site1.id, role: 'admin' },
    { userId: admin.id, siteId: site2.id, role: 'admin' },
    { userId: editor.id, siteId: site1.id, role: 'editor' },
  ]) {
    await prisma.siteUser.upsert({
      where: { userId_siteId: { userId: membership.userId, siteId: membership.siteId } },
      update: {},
      create: membership,
    });
  }

  // 舊資料表只在全新資料庫為空時補範例，不刪除操作員資料。
  if (await prisma.page.count() === 0) {
    await prisma.page.createMany({
      data: [
        { siteId: site1.id, title: '首頁', slug: 'home', content: '<h1>歡迎來到中和都更案</h1>' },
        { siteId: site1.id, title: '關於我們', slug: 'about', content: '<h1>關於中和都更案</h1>' },
        { siteId: site2.id, title: '首頁', slug: 'home', content: '<h1>歡迎來到板橋都更案</h1>' },
      ],
    });
  }

  if (await prisma.post.count() === 0) {
    await prisma.post.createMany({
      data: [
        { siteId: site1.id, title: '都更進度報告', slug: 'progress-report', content: '<p>本月進度順利</p>', published: true },
        { siteId: site1.id, title: '居民說明會', slug: 'community-meeting', content: '<p>將於下週舉辦</p>', published: false },
        { siteId: site2.id, title: '動工典禮', slug: 'groundbreaking', content: '<p>正式動工</p>', published: true },
      ],
    });
  }

  if (await prisma.announcement.count() === 0) {
    await prisma.announcement.create({
      data: {
        siteId: site1.id,
        title: '都更專案網站正式啟用',
        slug: 'site-launch',
        summary: '歡迎查看專案最新消息。',
        status: 'published',
        publishedAt: new Date(),
      },
    });
  }

  if (await prisma.progressItem.count() === 0) {
    await prisma.progressItem.create({
      data: {
        siteId: site1.id,
        stageDate: new Date(),
        stageLabel: '準備階段',
        title: '專案資料建置',
        progressStatus: 'current',
        status: 'published',
        publishedAt: new Date(),
      },
    });
  }

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
