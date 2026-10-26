export const VERIFIED_AT = "2026-10-23";
export const PROVINCE_RECOGNIZED_2025 = 11871;
export const SHENZHEN_BATCH_2025 = 7249;

export const OFFICIAL_SOURCES = {
  provinceList2025: {
    title: "广东省2025年高新技术企业名单",
    subtitle: "粤科函产字〔2026〕165号 · 11,871家",
    date: "2026-01-29",
    url: "https://gdstc.gd.gov.cn/zwgk_n/tzgg/content/post_4850173.html"
  },
  province2026Notice: {
    title: "广东省2026年高新技术企业认定工作通知",
    subtitle: "粤科函产字〔2026〕903号 · 三批次申报安排",
    date: "2026-05-29",
    url: "https://gdstc.gd.gov.cn/zwgk_n/tzgg/content/post_4904061.html"
  },
  province2026Extension: {
    title: "广东省2026年高企申报时间延长通知",
    subtitle: "粤科函产字〔2026〕1359号",
    date: "2026-07-29",
    url: "https://gdstc.gd.gov.cn/zwgk_n/tzgg/content/post_4934973.html"
  },
  shenzhenLocal2026: {
    title: "深圳市2026年高新技术企业认定工作通知",
    subtitle: "深圳市工业和信息化局",
    date: "2026-06-18",
    url: "https://www.sz.gov.cn/cn/xxgk/zfxxgj/tzgg/content/post_12850471.html"
  },
  provinceScale2023: {
    title: "广东高新技术企业数量连续8年全国第一",
    subtitle: "2023年全省预计超过7.5万家",
    date: "2024-01-23",
    url: "https://gdstc.gd.gov.cn/kjzx_n/mtjj/content/post_4339498.html"
  },
  geoData: {
    title: "广东省地级市行政边界",
    subtitle: "DataV GeoAtlas 公开 GeoJSON",
    url: "https://geo.datav.aliyun.com/areas_v3/bound/440000_full.json"
  }
};

export const CITIES = [
  {
    id: "shenzhen", name: "深圳", fullName: "深圳市", code: "440300",
    count2025: 7249, countNote: "2025年第一批备案名录",
    provinceShare: null, metricScope: "shenzhen",
    phone: "0755-26548598、88102613、88102087",
    portal: "https://gxj.sz.gov.cn/",
    localPolicy: OFFICIAL_SOURCES.shenzhenLocal2026
  },
  {
    id: "guangzhou", name: "广州", fullName: "广州市", code: "440100",
    count2025: 3223, countNote: "2025年省认定名录",
    phone: "020-89443692、80929493",
    portal: "https://kjj.gz.gov.cn/",
    localPolicy: {
      title: "广州市2025年高新技术企业认定工作通知",
      subtitle: "广州市科技局、财政局、税务局",
      date: "2025",
      url: "https://www.gz.gov.cn/xw/tzgg/content/mpost_10311418.html"
    }
  },
  {
    id: "dongguan", name: "东莞", fullName: "东莞市", code: "441900",
    count2025: 2866, countNote: "2025年省认定名录",
    phone: "0769-22831332",
    portal: "https://dgstb.dg.gov.cn/",
    localPolicy: {
      title: "东莞市2025年高新技术企业认定工作通知",
      subtitle: "东莞市科学技术局",
      date: "2025",
      url: "https://dgstb.dg.gov.cn/xxgk/zfxxgk/zfxxgkml/qt/tzgg/content/post_4392833.html"
    }
  },
  {
    id: "foshan", name: "佛山", fullName: "佛山市", code: "440600",
    count2025: 1706, countNote: "2025年省认定名录",
    phone: "0757-83355498",
    portal: "http://fskjj.foshan.gov.cn/",
    localPolicy: {
      title: "佛山市2025年高新技术企业认定申报通知",
      subtitle: "佛山市科学技术局",
      date: "2025",
      url: "http://fskjj.foshan.gov.cn/2018/zt/xmsb/content/post_6602244.html"
    }
  },
  {
    id: "huizhou", name: "惠州", fullName: "惠州市", code: "441300",
    count2025: 853, countNote: "2025年省认定名录",
    phone: "0752-2869300",
    portal: "https://sti.huizhou.gov.cn/",
    localPolicy: {
      title: "惠州市2025年高新技术企业认定工作通知",
      subtitle: "惠州市科技局、财政局、税务局",
      date: "2025",
      url: "https://sti.huizhou.gov.cn/gkmlpt/content/5/5544/mpost_5544488.html"
    }
  },
  {
    id: "zhongshan", name: "中山", fullName: "中山市", code: "442000",
    count2025: 830, countNote: "2025年省认定名录",
    phone: "0760-88303920",
    portal: "http://kj.zs.gov.cn/",
    localPolicy: {
      title: "中山市转发广东省2025年高企认定通知",
      subtitle: "中山市科学技术局",
      date: "2025",
      url: "http://kj.zs.gov.cn/sy/tzgg/content/post_2519424.html"
    }
  },
  {
    id: "zhuhai", name: "珠海", fullName: "珠海市", code: "440400",
    count2025: 723, countNote: "2025年省认定名录",
    phone: "0756-2155069、2213091",
    portal: "https://www.zhuhai.gov.cn/kjcxj/",
    localPolicy: {
      title: "珠海市转发广东省2025年高企认定通知",
      subtitle: "珠海市科技创新局",
      date: "2025",
      url: "https://www.zhuhai.gov.cn/kjcxj/gkmlpt/content/3/3805/mpost_3805762.html"
    }
  },
  {
    id: "jiangmen", name: "江门", fullName: "江门市", code: "440700",
    count2025: 390, countNote: "2025年省认定名录",
    phone: "0750-8220246",
    portal: "http://www.jiangmen.gov.cn/bmpd/jmskxjsj/",
    localPolicy: {
      title: "江门市2025年高企认定申报政策通知",
      subtitle: "鹤山市人民政府转发",
      date: "2025",
      url: "http://www.heshan.gov.cn/zwgk/xxgk/hsskgswj/gzdt/tzgg/content/post_3327999.html"
    }
  },
  {
    id: "zhaoqing", name: "肇庆", fullName: "肇庆市", code: "441200",
    count2025: 248, countNote: "2025年省认定名录",
    phone: "0758-2899813",
    portal: "https://www.zhaoqing.gov.cn/zqkjj/",
    localPolicy: {
      title: "肇庆市转发广东省2025年高企认定通知",
      subtitle: "肇庆市科学技术局",
      date: "2025",
      url: "https://www.zhaoqing.gov.cn/zqkjj/gkmlpt/content/3/3122/mpost_3122612.html"
    }
  },
  {
    id: "shantou", name: "汕头", fullName: "汕头市", code: "440500",
    count2025: 200, countNote: "2025年省认定名录",
    phone: "0754-88426672",
    portal: "https://www.shantou.gov.cn/kjj/",
    localPolicy: null
  },
  {
    id: "qingyuan", name: "清远", fullName: "清远市", code: "441800",
    count2025: 161, countNote: "2025年省认定名录",
    phone: "0763-3360585",
    portal: "http://www.gdqy.gov.cn/xxgk/zzjg/zfjg/qyskxjsj/",
    localPolicy: {
      title: "清远市转发广东省2025年高企认定通知",
      subtitle: "连山市人民政府转发",
      date: "2025",
      url: "http://www.gdls.gov.cn/qylsjjcj/gkmlpt/content/2/2028/mpost_2028158.html"
    }
  },
  {
    id: "shaoguan", name: "韶关", fullName: "韶关市", code: "440200",
    count2025: 121, countNote: "2025年省认定名录",
    phone: "0751-8775671",
    portal: "https://www.sg.gov.cn/zw/zdlyxxgk/dzjg/sgskxjsj/",
    localPolicy: {
      title: "韶关市2025年度高企认定工作通知",
      subtitle: "韶关市科学技术局",
      date: "2025",
      url: "https://www.sg.gov.cn/zw/zdlyxxgk/dzjg/sgskxjsj/kjglhxmjfxxgk/kjjh/sbxm/content/post_2752872.html"
    }
  },
  {
    id: "heyuan", name: "河源", fullName: "河源市", code: "441600",
    count2025: 98, countNote: "2025年省认定名录",
    phone: "0762-3389039",
    portal: "http://www.heyuan.gov.cn/bmjy/hyskxjsj/",
    localPolicy: {
      title: "河源市2025年高企认定推荐工作通知",
      subtitle: "河源市科学技术局",
      date: "2025",
      url: "http://www.heyuan.gov.cn/bmjy/hyskxjsj/tzgg/content/post_657476.html"
    }
  },
  {
    id: "chaozhou", name: "潮州", fullName: "潮州市", code: "445100",
    count2025: 90, countNote: "2025年省认定名录",
    phone: "0768-2393559",
    portal: "https://www.chaozhou.gov.cn/zwgk/szfgz/kjj/",
    localPolicy: {
      title: "潮安区转发广东省2025年高企认定通知",
      subtitle: "潮安区工业和科技信息化局",
      date: "2025",
      url: "https://www.chaoan.gov.cn/zwgk/gsgg/content/post_3950564.html"
    }
  },
  {
    id: "jieyang", name: "揭阳", fullName: "揭阳市", code: "445200",
    count2025: 85, countNote: "2025年省认定名录",
    phone: "0663-8768141",
    portal: "http://www.jieyang.gov.cn/kjj/",
    localPolicy: {
      title: "揭阳市2025年高新技术企业认定工作通知",
      subtitle: "揭阳市科学技术局",
      date: "2025",
      url: "http://www.jieyang.gov.cn/kjj/zxzx/content/post_947026.html"
    }
  },
  {
    id: "meizhou", name: "梅州", fullName: "梅州市", code: "441400",
    count2025: 64, countNote: "2025年省认定名录",
    phone: "0753-2242410",
    portal: "https://www.meizhou.gov.cn/",
    localPolicy: null
  },
  {
    id: "maoming", name: "茂名", fullName: "茂名市", code: "440900",
    count2025: 64, countNote: "2025年省认定名录",
    phone: "0668-2298244",
    portal: "http://www.maoming.gov.cn/",
    localPolicy: null
  },
  {
    id: "zhanjiang", name: "湛江", fullName: "湛江市", code: "440800",
    count2025: 47, countNote: "2025年省认定名录",
    phone: "0759-3338445",
    portal: "https://www.zhanjiang.gov.cn/",
    localPolicy: null
  },
  {
    id: "yunfu", name: "云浮", fullName: "云浮市", code: "445300",
    count2025: 45, countNote: "2025年省认定名录",
    phone: "0766-8923930",
    portal: "https://www.yunfu.gov.cn/kjj/",
    localPolicy: null
  },
  {
    id: "yangjiang", name: "阳江", fullName: "阳江市", code: "441700",
    count2025: 41, countNote: "2025年省认定名录",
    phone: "0662-3418428",
    portal: "http://www.yangjiang.gov.cn/",
    localPolicy: null
  },
  {
    id: "shanwei", name: "汕尾", fullName: "汕尾市", code: "441500",
    count2025: 16, countNote: "2025年省认定名录",
    phone: "0660-3369796",
    portal: "https://www.shanwei.gov.cn/swkjj/",
    localPolicy: {
      title: "汕尾市转发广东省2025年高企认定通知",
      subtitle: "汕尾市科技局",
      date: "2025",
      url: "https://www.shanwei.gov.cn/swkjj/zwgk/0700/content/post_1155182.html"
    }
  }
];

const provinceCounts = CITIES
  .filter((city) => city.id !== "shenzhen")
  .reduce((sum, city) => sum + city.count2025, 0);

if (provinceCounts !== PROVINCE_RECOGNIZED_2025) {
  throw new Error(`Guangdong city counts mismatch: ${provinceCounts}`);
}

export const CITY_BY_CODE = new Map(CITIES.map((city) => [city.code, city]));
export const CITY_BY_NAME = new Map(CITIES.map((city) => [city.fullName, city]));
