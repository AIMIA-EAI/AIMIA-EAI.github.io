# AIMIA 实验室网站

北京大学 AIMIA 实验室的中英文 Astro 静态网站，目标地址为 `https://aimia-eai.github.io/`。日常维护修改内容文件，页面模板与数据分开管理。

- 英文：`/`；中文：`/zh/`。语言切换保留页面、搜索参数和锚点。
- 主导航：研究成果、团队建设、加入我们。
- 研究成果统一展示项目、平台、数据集和论文，并保留专利、荣誉及折叠动态。
- 团队页保留 13 张团体照片、导师、在读学生和独立校友名录。
- 首页三方向动画为研究示意，不代表实验录像或实验结果。

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
