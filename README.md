# AIMIA 实验室网站

北京大学 AIMIA 实验室的中英文 Astro 静态网站，目标地址为 `https://aimia-eai.github.io/`。日常维护修改内容文件，页面模板与数据分开管理。

- 默认首页 `/` 和 `/zh/` 为中文，英文首页为 `/en/`。英文内页为 `/research/`、`/people/` 等，中文内页加 `/zh/`；语言切换保留页面、搜索参数和锚点。
- 主导航：研究成果、团队建设、加入我们。
- 研究成果统一展示项目、平台、数据集和论文，并保留专利、荣誉及折叠动态。
- 团队页保留 13 张团体照片、导师、在读学生和独立校友名录。
- 首页三方向动画为研究示意，不代表实验录像或实验结果。

## 代码结构与数据流

```text
src/
├── pages/       路由入口；根首页默认中文，en/ 英文首页，zh/ 中文页面
├── views/       Home、Research、People 等共享页面模板
├── layouts/     Layout：元数据、页头、正文、访问足迹、页脚
├── components/  成果卡片、成员卡片、图表、轮播、研究动画等展示单元
├── scripts/     浏览器交互：研究示意、成果搜索与年度分组筛选
├── lib/         数据整合、双语翻译、路径兼容等共享逻辑
├── data/        组内日常维护的 JSON 内容及统计快照
└── styles/      全站基础样式与桌面首页吸附样式
public/          图片、PDF、图标及构建时生成的兼容入口
scripts/         Node 构建检查与统计更新；与 src/scripts/ 的浏览器代码分开
.github/         GitHub Actions 自动构建、统计更新与 Pages 发布
```

请求先进入 `pages/` 的路由文件，再由 `views/` 选择共享模板。模板读取 `data/`，通过 `lib/` 整理并交给组件，最后由 Astro 生成 `dist/` 静态网页。只有搜索、轮播、动画、图表等交互需要浏览器 JavaScript；没有常驻应用后端和数据库。

研究成果的数据链为 `publications.json` → `lib/content.ts`（去重、排序）→ `lib/research-outputs.ts`（整合论文、项目、平台与数据集）→ `PublicationArchive.astro`（按年分组）→ `PaperRow.astro`（卡片）。`src/scripts/publication-archive.ts` 负责搜索、筛选及组内数量同步。未注明年份的项目单独展示，不补造年份。

首页精选与完整档案使用不同展示规则：首页每个研究方向展示一篇相关论文；录用动态读取 `news.json`，不会从论文表自动推断录用时间。完整成果页展示所有有效记录。新增论文后若希望进入方向筛选，需要填写 `researchAreas`。

研究概览的 SVG 与局部样式在 `ResearchMotion.astro`，浏览器交互在 `src/scripts/research-motion.ts`；内容修改先查 `src/data/`，交互修改再查 `src/scripts/`。组件局部样式优先放在组件内，跨页面的公共样式才放进 `global.css`，避免新增重复覆盖规则。

## 本地开发与验收

需要 Node.js **>=22.23.4**，建议使用 Node.js 24。包管理器固定为 `pnpm@11.25.0`。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

服务只监听 `127.0.0.1`，默认端口 `4321`；以终端实际输出为准。

```sh
pnpm build
pnpm preview
```

`pnpm build` 依次执行内容校验、兼容入口生成、Astro 类型检查、静态构建与产物链接检查。`pnpm preview` 只预览已有 `dist/`，修改源码后需先重新构建。`pnpm check` 只检查当前内容和已有产物，不能替代完整构建。

## 维护入口

| 路径                                            | 用途                                                  |
| ----------------------------------------------- | ----------------------------------------------------- |
| `src/data/site.json`                            | 首页与研究方向，顺序为具身、多模态、AI4S              |
| `src/data/people.json`                          | 导师、博士生、硕士生、校友                            |
| `src/data/gallery.json`                         | 团体照片、双语字幕与取景设置                          |
| `src/data/publications.json`                    | 论文、作者、分类及论文/代码链接                       |
| `src/data/resources.json`                       | 项目、平台、数据集、专利与软件著作权                  |
| `src/data/news.json`、`src/data/lab.json`       | 动态、实验室资料、联系信息与招生                      |
| `src/data/zh.json`                              | 中文翻译                                              |
| `public/media/`                                 | 页面实际使用的图片、校徽与旧路径映射                  |
| `public/assets/files/`                          | PDF 的唯一维护位置，URL 为 `/assets/files/文件名.pdf` |
| `src/views/`、`src/components/`、`src/layouts/` | 共享视图、交互组件与布局                              |
| `src/styles/global.css`                         | 全站样式                                              |
| `scripts/`                                      | 内容校验、兼容入口生成和构建产物检查                  |
| `site.config.mjs`                               | 站点域名，供 canonical、sitemap、robots 共用          |
| `.github/workflows/pages.yml`                   | 构建检查与自动 Pages 发布                             |

### 论文与研究成果

论文新增到 `publications.json`，保留正式题名、作者、年份、会议和准确链接。`researchAreas` 使用 `embodied`、`multimodal`、`ai-for-science`，允许多选；无法确定归类的历史工作使用空数组。`tags` 保留历史主题，兼容旧筛选链接。

`duplicateOf` 指向重复工作的保留条目；同一项目与论文在统一列表中合并展示。不要将概念示意图当作已发表工作的实验结果，也不要为未发布工作编造网址。

### 首页动态与荣誉

首页的“研究动态”和“荣誉与奖励”复用现有数据，不另建内容副本。在 `news.json` 的条目上设置 `homepageFeatured: true`，首页按原始消息日期倒序展示最多 6 条；完整历史记录继续通过研究页的“全部动态”入口访问。消息日期不是会议届次或论文发表日期，不根据常见录用时间推改。

荣誉维护在 `lab.json` 的 `honors`，中文对应 `zh.json` 的 `honors`；两种语言保持相同 `id`、年份和 `homepageFeatured`。首页展示精选项，研究页保留全部荣誉。`url` 用于官方来源，`originalText` 保留原稿；CAMEO 名次须保留榜单周期，入围奖项须写明“入围”。

### 成员与照片

`directoryAsOf` 是名录资料的截止月份（`YYYY-MM`），中英文页均据此显示，不能用代码修改日期替代。`membershipUpdatedOn` 仅记录维护操作日期。博士与硕士各自按数组顺序展示。

`people.json` 按 `faculty`、`phd`、`masters`、`alumni` 分组。毕业时移动完整记录并保留 ID；`cohort` 是入学年份，未知填 `null`。头像放到 `public/media/` 并使用 `/media/文件名`；没有确认照片时保留空值，不凭缩写猜测身份。

校友按 `group` 自动分为博士毕业生、硕士毕业生和博士后校友；硕士校友再按 `cohort` 入学年级从早到晚分组，年级未知时单列，每个年级内保留数组顺序。`homepage` 用于个人主页或学术主页链接。所有主页链接统一标为“个人主页”，英文页对应 Website，包括 Google Scholar 链接。

校友 `destination` 维护英文去向，对应中文写在 `zh.json` 的 `terms`；构建会检查所有已填写去向的中文覆盖。姓名保留英文拼音，未提供的去向或校区不推断补齐。

`gallery.json` 中 `image` 是实际展示的图片，`source` 和 `originalIndex` 只记录历史来源。替换照片时填写中英文字幕和替代文字，并检查手机构图；宽幅照片可设置 `mobileFit: "contain"`。

### 手动添加成员：可复制示例

在 `src/data/people.json` 中，将记录加入 `phd`（博士）或 `masters`（硕士）数组。以下为格式示例，请替换示例姓名、ID、入学年级和链接：

```json
{
  "id": "example-student",
  "name": "Example Student",
  "role": "Ph.D. student",
  "cohort": 2026,
  "image": null,
  "interests": ["Video Generation"],
  "homepage": null,
  "scholar": null
}
```

- `id` 在整个名录中唯一，建议使用英文姓名的小写连字符形式；已发布 ID 保持稳定。
- 硕士使用 `role: "Master's student"`，并放进 `masters` 数组。数组中的位置就是展示顺序；人数自动计算。
- 照片放入 `public/media/example-student.jpg`，将 `image` 改成 `/media/example-student.jpg`；没有照片填 `null`，会显示占位。
- 个人网站、Google Scholar 或 GitHub 均可填写在 `homepage`，须为完整 HTTPS 地址；这个字段决定成员卡片上的“个人主页”入口，单独填写 `scholar` 不会给学生卡片增加入口。
- `interests` 存英文方向名，例如 `"Video Generation"`。新方向同时在 `src/data/zh.json` 的 `interests` 对象增加 `"Video Generation": "视频生成"`；已有翻译直接复用，不重复添加键。
- `cohort` 为入学年级，未知填 `null`。名录整体更新时再按实际资料调整 `directoryAsOf`；不要把它当成系统当前日期。
- JSON 使用双引号，相邻记录之间加逗号，最后一项后不加逗号。

毕业时将原记录从在读数组移动到 `alumni`，保留 `id`、照片及个人主页；`role` 和 `group` 使用 `"Ph.D. alumni"` 或 `"Master's alumni"`。可填写英文 `destination`，并在 `zh.json` 的 `terms` 增加对应中文；去向课题组网址填 `destinationHomepage`，与个人主页分开。

### 修改方向与检查发布

成员兴趣只需修改 `people.json` 的 `interests` 和相应中文翻译。修改网站已有三大方向的说明，编辑 `site.json` 的 `directions` 及 `zh.json` 的 `directions`；研究概览示意中的标题、说明在 `ResearchMotion.astro`。论文的方向分类填在 `publications.json` 的 `researchAreas`，当前支持 `embodied`、`multimodal`、`ai-for-science`。

增加第四个网站级方向需要同步调整方向标签、翻译、校验和研究概览布局，不能只在 JSON 中加一个对象。一般新增学生研究兴趣无需增加网站级方向。

```sh
pnpm dev --port 4323
# 在浏览器检查中英文页面，确认姓名、头像、方向及链接
pnpm build
# 检查实际差异，只提交本次涉及的数据和素材
# git add 后列出具体文件路径
# git commit -m "Update member directory"
git push origin main
```

`pnpm build` 会提示重复 ID、缺失照片或中文翻译等问题。推送 `main` 后由 Actions 检查并发布；本地保存或本地 commit 本身不会上线。

### 图片、PDF 与来源信息

新素材直接使用 `/media/...` 或 `/assets/files/...`。旧 `/assets/images/...` 引用由 `public/media/manifest.json` 映射到现有优化图片；映射目标必须存在，旧站原始文件不参与构建。不要重新复制整套旧图片或 PDF 副本。

`source`、`originalText`、`portraitSource`、`normalizationNotes` 等字段保留迁移出处；其中旧 HTML 路径不是当前文件依赖。`sourceDate` 表示原资料日期，不能仅因排版调整就改成今天。新成员身份、去向和招生信息应经课题组确认。

## 旧地址兼容

构建会生成 `Publications.html`、`page3.html`、`page6.html`、`page2.html`、`page4.html`、`register.html` 等兼容入口；旧论文、资源和活动 URL 仍可访问。`/publications/` 与 `/news/` 保留查询和锚点，转向研究页。

旧 Mobirise HTML、原图、字体、模板脚本及 `history/` 已迁出本仓库并独立备份。清理记录见 [docs/CLEANUP.md](docs/CLEANUP.md)。原有内容记录、实际使用图片、全部 PDF 和兼容入口保留。

## 提交与发布

只提交源码、内容、素材、锁文件和维护配置。`node_modules/`、`dist/`、`.astro/`、`.local-preview/`、macOS 元数据和自动生成的兼容页/站点地图均被忽略。

工作流对 `main` 的 Push / PR 执行完整构建检查。在目标仓库 `AIMIA-EAI/AIMIA-EAI.github.io` 推送到 `main` 后，检查通过即自动发布 `dist/`；PR 仅检查，不发布。仍可通过 Actions → Run workflow 选择 `main` 手动重新发布。仓库 Settings → Pages 需选择 GitHub Actions；仅在本地 commit 不会发布，需要 `git push origin main`。

GitHub 组织首页由独立的 [AIMIA-EAI/.github](https://github.com/AIMIA-EAI/.github) 仓库维护。本网站仓库不再保留组织 README 和其 GIF 的重复副本。

## 首页研究影响力图表

- `src/data/github-metrics.json`：AIMIA-EAI 全部公开仓库的 Star 总数及官方每周历史获星记录；曲线累加历史事件，当前总数可能因取消 Star、仓库转移等而不同。
- `pnpm metrics:github`：完整分页更新组织仓库和历史记录。正式发布前自动运行；失败会中止发布，已有官网继续可用。本地构建与 PR 检查使用已保存的数据，不调用外部 API。
- `src/data/scholar-metrics.json`：陈杰老师（`ZAZFfwwAAAAJ`）公开 Scholar 页面的总引用、h-index 和各年引用量。曲线自最早可见年份起逐年累加，不把未分配到可见年份的引用推算为早期数据，也不代表历年保存的总引用快照。手动核验更新 `verifiedAt`、`total`、`hIndex` 和 `annual`，不要把逐年引用量当作历史总引用快照。当年数据为截至核验日的部分年度数据。
- 图表支持鼠标或触摸查看，底部滑条支持键盘方向键；禁用 JavaScript 时仍显示完整图表和数据摘要。两项数据各自展示更新日期。

### Daily metrics refresh

GitHub Actions refreshes both metrics daily at **09:17 Asia/Shanghai (01:17 UTC)**, then rebuilds and deploys the website. GitHub may delay scheduled runs; a local computer is not required. Pushes to main and manual releases also refresh metrics. Pull requests do not call the remote sources.

`pnpm metrics:scholar` reads the public Jie Chen profile and verifies the identity, totals and annual data before saving. If access is blocked or the format changes, it preserves the latest successful snapshot and its original verification date, emits a workflow warning, and lets Star updates and publication continue. The snapshot is published at `/metrics/scholar.json` and restored before future refreshes, so successful scheduled updates survive without Git write permissions. The committed JSON is the initial fallback; manual verification remains supported. `pnpm test:scholar` covers parsing, historical-year retention, invalid data and source validation.

## Visitor footprint

`src/data/visitor-widget.json` stores the public MapMyVisitors IDs supplied by the maintainer. The flat map is active; the alternative globe ID is retained for future changes and is not loaded. A single sandboxed iframe above the footer loads the active widget on each page, including the member and research pages. It is deliberately not lazy-loaded, so collection does not depend on reaching the footer. The service defines the counters; the current widget reports pageviews, which must not be relabeled as unique people.

`VisitorFootprint.astro` provides the bilingual layout and a link to the site's public statistics. `/widgets/visitors/en/` and `/widgets/visitors/zh/` isolate third-party scripts and styles. The frame can report only its bounded display height to the parent, opens its statistics link in a new tab, and shows an unavailable message if loading fails. No artificial visitor totals or locations are added by the website. As with other externally hosted widgets, browsers or network filters may block the provider. Local preview loads the real widget and can be counted by the service.
