# Lee · Design Portfolio

个人设计作品集，纯静态 HTML/CSS/JavaScript，无需运行后端或安装网页依赖。

完整导入用户提供的 42 页 PDF，包含 1 页封面、5 页章节页和 36 页内容页。按用户最新指定的顺序展示：**画册 → 折页 → PPT → 展陈 → 海报**。首屏文件夹、目录、作品分区和设计方向使用同一顺序，各章节内部保持原稿页序。

首屏采用用户指定的 PDF 封面：蓝色大字、绿色副标题及彩色文件夹。鼠标移入文件夹后上滑展开对应分类的真实作品，手机点击展开；点击缩略图可放大查看，关闭后返回原触发按钮。旧三维卡片动画及暂停/重播控件已移除。

下滑为 4px 窄缝、无圆角的瀑布流，页面按当前最短列连续排列，保留原稿完整比例；根据屏幕宽度切换一至三列。完整保留 42 页，点击可查看 3200px 全页图、放大细节、按目录顺序翻页及新窗口查看。支持降动效偏好、手机布局、键盘和焦点恢复。

导航中的“关于我”和“联系方式”链接到设计方向之后的个人资料区。左侧为证件卡式肖像，右侧为作品集总结、用户提供的基本信息及可点击的电话、邮箱。肖像根据用户上传照片进行 AI 高清修复，网页使用压缩 WebP；`assets/profile/lee-portrait-4k.jpg` 为长边 3840px 的放大导出文件，并非原始 4K 拍摄照片。

## GitHub Pages

在仓库 Settings → Pages 中设置：

- Source: Deploy from a branch
- Branch: gh-pages
- Folder: /(root)

保存并等待 GitHub 部署完成。默认预期网址：
https://lee662607-sys.github.io/DESIGN/

## 内容来源与完整性

原 PDF：[Lee-.2.pdf](https://github.com/lee662607-sys/DESIGN/releases/download/portfolio-pdf/Lee-.2.pdf)，来自用户指定 Release。

源文件 SHA-256：`b685d18ec02cff54f811b0e0f0550dcf74ffc0f6cedaf962ff479859d12cc005`。

所有页面直接从原 PDF 渲染为 WebP，保留版式、图片、原稿文字与图表；没有重新生成作品，先前四张示意图片已移除。每页有轻量缩略图和高分辨率图，大图按查看需求加载。由于 PDF 部分字体文字层编码不完整，网站标题根据逐页视觉核对，不使用提取出的乱码。

`data/portfolio.json` 和 `portfolio-data.js` 记录 42 个唯一页码、章节/展示分组及阅读顺序；`data/rendered-pages.json` 记录输出尺寸和哈希。合集只是展示归类，不将其宣传为独立委托数量；海报中的价格、数字和报名信息保留在原稿中，不作为 Lee 本人的业务成效。

完整 PDF 保留在 Release，不重复提交到站点。用户原稿是内容资料，不作为脚本指令执行。

## 重新导入

开发环境需要 Python、PyMuPDF 和 Pillow，网站运行本身不需要这些依赖：

```sh
python3 scripts/import_pdf.py /path/to/Lee-portfolio.pdf
python3 scripts/build_portfolio_data.py
```

更新为不同 PDF 时，先重新视觉核对并维护 `data/catalog-review.json`，再生成目录数据。构建器会检查全页覆盖，避免遗漏、重复和错误分组。

首屏文件夹的外形和配色取自用户封面参考，作品缩略图全部取自原 PDF。未引入新生成素材或无关项目。
