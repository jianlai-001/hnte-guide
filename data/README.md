# Data attribution and methodology

## 广东地市名录数量

地图采用“2025 年认定 / 备案名录”口径，而不是“当前有效高企存量”。两者含义不同：

- 认定 / 备案名录表示对应年度被公布的新认定企业数量。
- 有效存量会随三年有效期、复审、迁移和撤销变化，需要另用主管部门最新统计口径。

广东省科学技术厅公布的 2025 年高企名单共 11,871 家，按名单内“所在地市”列统计到 20 个地市。该省级名单不含深圳。

深圳采用公开的 2025 年第一批备案名单数量 7,249 家，单独列示，避免与省级名单重复计算。深圳认定工作由深圳市相关部门单独组织。

原始官方页面：

- [广东省 2025 年高新技术企业名单](https://gdstc.gd.gov.cn/zwgk_n/tzgg/content/post_4850173.html)
- [广东省 2026 年高新技术企业认定工作通知](https://gdstc.gd.gov.cn/zwgk_n/tzgg/content/post_4904061.html)
- [广东省 2026 年申报时间延长通知](https://gdstc.gd.gov.cn/zwgk_n/tzgg/content/post_4934973.html)
- [深圳市 2026 年高新技术企业认定工作通知](https://www.sz.gov.cn/cn/xxgk/zfxxgj/tzgg/content/post_12850471.html)

## 地理边界

`guangdong.geo.json` 来自 DataV GeoAtlas：

<https://geo.datav.aliyun.com/areas_v3/bound/440000_full.json>

文件保留 21 个地级市边界。应用使用 `d3-geo` 的墨卡托投影绘制二维区域；三维地球使用同一地理坐标转换到球面。DataV GeoJSON 的环方向与 D3 球面多边形约定不一致，代码在加载时只反转环坐标顺序，不改变任何经纬度。

世界国家轮廓来自 `world-atlas@2/countries-110m.json`，以本地打包形式使用。

## 政策链接

页面展示最新可核验的省级 2026 年通知及时间调整。各城市的本地政策卡片优先链接该市主管部门正式通知；
未取得稳定直达链接的城市，链接到本地科技主管部门入口。

所有链接核验日期：2026-10-23。外部政策页面可能随主管部门网站调整而变化。
