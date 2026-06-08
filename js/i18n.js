const LANGUAGES = {
  zh: {
    name: '中文',
    title: '太阳系模拟器',
    orientation: '请旋转设备至横屏模式以获得最佳体验',
    loadingTitle: '太阳系模拟器',
    loadingInitial: '正在加载...',
    loading: {
      initScene: '初始化场景...',
      createLighting: '创建光照...',
      calcPosition: '计算实时轨道位置...',
      genStars: '生成星空...',
      createPlanets: '创建行星...',
      calcOrbits: '计算轨道...',
      createExtended: '创建扩展天体...',
      createEffects: '创建视觉效果...',
      initMaterial: '初始化材质系统...',
      initControl: '初始化控制器...',
      bindEvents: '绑定事件...',
      ready: '准备就绪！',
      loadFailed: '加载失败: ',
      loadingTexture: '加载中...'
    },
    ui: {
      planetListHeader: '天体',
      dateFormat: '{y}年{m}月{d}日',
      panelHeader: '控制面板',
      speedLabel: '时间速度',
      pause: '暂停',
      resume: '继续',
      resetView: '重置视角',
      screenshot: '截图',
      displayMode: '显示模式',
      texture: '真实纹理',
      starfield: '美丽星空',
      showExtraOrbits: '显示扩展轨道',
      hideExtraOrbits: '隐藏扩展轨道',
      habitable: '宜居带',
      showStarlink: '显示星链',
      hideStarlink: '隐藏星链'
    },
    info: {
      radius: '半径：',
      mass: '质量：',
      distance: '距太阳：',
      period: '公转周期：',
      moons: '卫星：',
      planetName: '行星名称'
    },
    planets: {
      sun: { name: '太阳', info: { radius: '696,340 km', mass: '1.989 × 10³⁰ kg', distance: '0 AU', period: '-', moons: '无' } },
      mercury: { name: '水星', info: { radius: '2,439 km', mass: '3.301 × 10²³ kg', distance: '0.39 AU', period: '88 天', moons: '无' } },
      venus: { name: '金星', info: { radius: '6,051 km', mass: '4.867 × 10²⁴ kg', distance: '0.72 AU', period: '225 天', moons: '无' } },
      earth: { name: '地球', info: { radius: '6,371 km', mass: '5.972 × 10²⁴ kg', distance: '1 AU', period: '365.25 天', moons: '月球', quote: '你所爱的每一个人，你认识的每一个人，你听说过的每一个人，曾经存在过的每一个人，都在它上面度过他们的一生。所有的欢乐与痛苦，千万种宗教与意识形态，所有的猎人与强盗，所有的英雄与懦夫，每一个文明的缔造者与毁灭者，每一个国王与农夫，每一对年轻的恋人，每一位母亲与父亲，每一个充满希望的孩子，都在这里——一粒悬浮在阳光中的微尘。', quoteSource: '卡尔·萨根《暗淡蓝点》' } },
      moon: { name: '月球', info: { radius: '1,737 km', mass: '7.342 × 10²² kg', distance: '384,400 km', period: '27.3 天', moons: '无' } },
      mars: { name: '火星', info: { radius: '3,389 km', mass: '6.417 × 10²³ kg', distance: '1.52 AU', period: '687 天', moons: '火卫一、火卫二' } },
      jupiter: { name: '木星', info: { radius: '69,911 km', mass: '1.898 × 10²⁷ kg', distance: '5.20 AU', period: '4,333 天', moons: '95颗已知卫星' } },
      saturn: { name: '土星', info: { radius: '58,232 km', mass: '5.683 × 10²⁶ kg', distance: '9.54 AU', period: '10,759 天', moons: '146颗已知卫星' } },
      uranus: { name: '天王星', info: { radius: '25,362 km', mass: '8.6813 × 10²⁵ kg', distance: '19.2 AU', period: '30,687 天', moons: '28颗已知卫星' } },
      neptune: { name: '海王星', info: { radius: '24,622 km', mass: '1.024 × 10²⁶ kg', distance: '30.1 AU', period: '60,190 天', moons: '16颗已知卫星' } }
    },
    extended: {
      pluto: { name: '冥王星', info: { radius: '1,188 km', mass: '1.309 × 10²² kg', distance: '39.5 AU', period: '247.9 年', moons: '5颗已知卫星' } },
      ceres: { name: '谷神星', info: { radius: '473 km', mass: '9.393 × 10²⁰ kg', distance: '2.77 AU', period: '4.6 年', moons: '无' } },
      io: { name: '木卫一/伊奥', info: { radius: '1,821 km', mass: '8.932 × 10²² kg', distance: '421,800 km', period: '1.77 天', moons: '无' } },
      europa: { name: '木卫二/欧罗巴', info: { radius: '1,561 km', mass: '4.799 × 10²² kg', distance: '671,100 km', period: '3.55 天', moons: '无' } },
      ganymede: { name: '木卫三/加尼美德', info: { radius: '2,634 km', mass: '1.482 × 10²³ kg', distance: '1,070,400 km', period: '7.15 天', moons: '无' } },
      callisto: { name: '木卫四/卡利斯托', info: { radius: '2,410 km', mass: '1.076 × 10²³ kg', distance: '1,882,700 km', period: '16.69 天', moons: '无' } },
      titan: { name: '土卫六/泰坦', info: { radius: '2,575 km', mass: '1.345 × 10²³ kg', distance: '1,221,870 km', period: '15.95 天', moons: '无' } }
    },
    spacecraft: {
      iss: { name: '国际空间站 ISS', info: { radius: '109 m × 73 m（翼展）', mass: '420,000 kg', distance: '400 km 轨道高度', period: '92 分钟', moons: '无' } },
      tiangong: { name: '中国空间站 天宫', info: { radius: '55.6 m（T 字构型）', mass: '约 100,000 kg（设计）', distance: '400 km 轨道高度', period: '约 92 分钟', moons: '无' } },
      starlink: { name: '星链星座 Starlink', info: { radius: '约 3 m × 2.8 m（V1.5）/ 约 4 m × 2.8 m（V2 Mini）', mass: '约 300 kg（V1.5）/ 约 800 kg（V2 Mini）', distance: '525 - 570 km 轨道高度', period: '约 90 - 95 分钟', moons: '约 9,900+ 颗在轨（Gen1+Gen2）' } },
      voyager: { name: '旅行者一号 Voyager 1', info: { radius: '约 2.3 m（高增益天线直径 3.7 m）', mass: '815 kg', distance: '约 170 AU（255 亿公里）', period: '无（逃离太阳系）', moons: '无' } }
    },
    asteroidBelt: { name: '小行星带', info: { radius: '1 ~ 100 km', mass: '约 3.0 × 10²¹ kg', distance: '2.2 ~ 3.2 AU', period: '3 ~ 6 年', moons: '无' } },
    comet: { name: '哈雷彗星', info: { radius: '11 km（彗核）', mass: '2.2 × 10¹⁴ kg', distance: '0.59 AU（近日点）~ 35.1 AU（远日点）', period: '75-76 年' } },
    listItems: {
      sun: '太阳', mercury: '水星', venus: '金星', earth: '地球', moon: '月球',
      mars: '火星', ceres: '谷神星', jupiter: '木星', saturn: '土星',
      uranus: '天王星', neptune: '海王星', pluto: '冥王星',
      asteroidBelt: '小行星带', halley: '哈雷彗星',
      iss: '国际空间站 ISS', tiangong: '中国空间站 天宫', voyager: '旅行者一号'
    },
    firstPerson: { hint: '{name} 表面 — 拖拽环顾 | ESC 退出' }
  },

  en: {
    name: 'English',
    title: 'Solar System Simulator',
    orientation: 'Rotate your device to landscape for the best experience',
    loadingTitle: 'Solar System Simulator',
    loadingInitial: 'Loading...',
    loading: {
      initScene: 'Initializing scene...',
      createLighting: 'Creating lighting...',
      calcPosition: 'Calculating orbit positions...',
      genStars: 'Generating starfield...',
      createPlanets: 'Creating planets...',
      calcOrbits: 'Calculating orbits...',
      createExtended: 'Creating extended bodies...',
      createEffects: 'Creating visual effects...',
      initMaterial: 'Initializing material system...',
      initControl: 'Initializing controls...',
      bindEvents: 'Binding events...',
      ready: 'Ready!',
      loadFailed: 'Loading failed: ',
      loadingTexture: 'Loading...'
    },
    ui: {
      planetListHeader: 'Objects',
      dateFormat: '{y}-{m}-{d}',
      panelHeader: 'Controls',
      speedLabel: 'Time Speed',
      pause: 'Pause',
      resume: 'Resume',
      resetView: 'Reset View',
      screenshot: 'Screenshot',
      displayMode: 'Display Mode',
      texture: 'Real Textures',
      starfield: 'Starfield',
      showExtraOrbits: 'Show Extra Orbits',
      hideExtraOrbits: 'Hide Extra Orbits',
      habitable: 'Habitable Zone',
      showStarlink: 'Show Starlink',
      hideStarlink: 'Hide Starlink'
    },
    info: {
      radius: 'Radius: ',
      mass: 'Mass: ',
      distance: 'Distance: ',
      period: 'Orbital Period: ',
      moons: 'Moons: ',
      planetName: 'Planet Name'
    },
    planets: {
      sun: { name: 'Sun', info: { radius: '696,340 km', mass: '1.989 × 10³⁰ kg', distance: '0 AU', period: '-', moons: 'None' } },
      mercury: { name: 'Mercury', info: { radius: '2,439 km', mass: '3.301 × 10²³ kg', distance: '0.39 AU', period: '88 days', moons: 'None' } },
      venus: { name: 'Venus', info: { radius: '6,051 km', mass: '4.867 × 10²⁴ kg', distance: '0.72 AU', period: '225 days', moons: 'None' } },
      earth: { name: 'Earth', info: { radius: '6,371 km', mass: '5.972 × 10²⁴ kg', distance: '1 AU', period: '365.25 days', moons: 'Moon', quote: 'Look again at that dot. That\'s here. That\'s home. That\'s us. On it everyone you love, everyone you know, everyone you ever heard of, every human being who ever was, lived out their lives. The aggregate of our joy and suffering, thousands of confident religions, ideologies, and economic doctrines, every hunter and forager, every hero and coward, every creator and destroyer of civilization, every king and peasant, every young couple in love, every mother and father, hopeful child, inventor and explorer, every teacher of morals, every corrupt politician, every "superstar," every "supreme leader," every saint and sinner in the history of our species lived there—on a mote of dust suspended in a sunbeam.', quoteSource: 'Carl Sagan, Pale Blue Dot' } },
      moon: { name: 'Moon', info: { radius: '1,737 km', mass: '7.342 × 10²² kg', distance: '384,400 km', period: '27.3 days', moons: 'None' } },
      mars: { name: 'Mars', info: { radius: '3,389 km', mass: '6.417 × 10²³ kg', distance: '1.52 AU', period: '687 days', moons: 'Phobos, Deimos' } },
      jupiter: { name: 'Jupiter', info: { radius: '69,911 km', mass: '1.898 × 10²⁷ kg', distance: '5.20 AU', period: '4,333 days', moons: '95 known' } },
      saturn: { name: 'Saturn', info: { radius: '58,232 km', mass: '5.683 × 10²⁶ kg', distance: '9.54 AU', period: '10,759 days', moons: '146 known' } },
      uranus: { name: 'Uranus', info: { radius: '25,362 km', mass: '8.6813 × 10²⁵ kg', distance: '19.2 AU', period: '30,687 days', moons: '28 known' } },
      neptune: { name: 'Neptune', info: { radius: '24,622 km', mass: '1.024 × 10²⁶ kg', distance: '30.1 AU', period: '60,190 days', moons: '16 known' } }
    },
    extended: {
      pluto: { name: 'Pluto', info: { radius: '1,188 km', mass: '1.309 × 10²² kg', distance: '39.5 AU', period: '247.9 years', moons: '5 known' } },
      ceres: { name: 'Ceres', info: { radius: '473 km', mass: '9.393 × 10²⁰ kg', distance: '2.77 AU', period: '4.6 years', moons: 'None' } },
      io: { name: 'Io', info: { radius: '1,821 km', mass: '8.932 × 10²² kg', distance: '421,800 km', period: '1.77 days', moons: 'None' } },
      europa: { name: 'Europa', info: { radius: '1,561 km', mass: '4.799 × 10²² kg', distance: '671,100 km', period: '3.55 days', moons: 'None' } },
      ganymede: { name: 'Ganymede', info: { radius: '2,634 km', mass: '1.482 × 10²³ kg', distance: '1,070,400 km', period: '7.15 days', moons: 'None' } },
      callisto: { name: 'Callisto', info: { radius: '2,410 km', mass: '1.076 × 10²³ kg', distance: '1,882,700 km', period: '16.69 days', moons: 'None' } },
      titan: { name: 'Titan', info: { radius: '2,575 km', mass: '1.345 × 10²³ kg', distance: '1,221,870 km', period: '15.95 days', moons: 'None' } }
    },
    spacecraft: {
      iss: { name: 'ISS', info: { radius: '109 m × 73 m (span)', mass: '420,000 kg', distance: '400 km orbit', period: '92 min', moons: 'None' } },
      tiangong: { name: 'Tiangong', info: { radius: '55.6 m (T-shape)', mass: '~100,000 kg (designed)', distance: '400 km orbit', period: '~92 min', moons: 'None' } },
      starlink: { name: 'Starlink', info: { radius: '~3 m × 2.8 m (V1.5) / ~4 m × 2.8 m (V2 Mini)', mass: '~300 kg (V1.5) / ~800 kg (V2 Mini)', distance: '525 - 570 km orbit', period: '~90 - 95 min', moons: '~9,900+ in orbit (Gen1+Gen2)' } },
      voyager: { name: 'Voyager 1', info: { radius: '~2.3 m (antenna 3.7 m)', mass: '815 kg', distance: '~170 AU (25.5 billion km)', period: 'N/A (escaping solar system)', moons: 'None' } }
    },
    asteroidBelt: { name: 'Asteroid Belt', info: { radius: '1 ~ 100 km', mass: '~3.0 × 10²¹ kg', distance: '2.2 ~ 3.2 AU', period: '3 ~ 6 years', moons: 'None' } },
    comet: { name: 'Halley\'s Comet', info: { radius: '11 km (nucleus)', mass: '2.2 × 10¹⁴ kg', distance: '0.59 AU (perihelion) ~ 35.1 AU (aphelion)', period: '75-76 years' } },
    listItems: {
      sun: 'Sun', mercury: 'Mercury', venus: 'Venus', earth: 'Earth', moon: 'Moon',
      mars: 'Mars', ceres: 'Ceres', jupiter: 'Jupiter', saturn: 'Saturn',
      uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto',
      asteroidBelt: 'Asteroid Belt', halley: 'Halley\'s Comet',
      iss: 'ISS', tiangong: 'Tiangong', voyager: 'Voyager 1'
    },
    firstPerson: { hint: '{name} Surface — Drag to look | ESC to exit' }
  }
};

let _currentLang = localStorage.getItem('solar-system-lang') || 'zh';

export function t(key) {
  const keys = key.split('.');
  let val = LANGUAGES[_currentLang];
  for (const k of keys) {
    if (val == null) return key;
    val = val[k];
  }
  return val ?? key;
}

export function setLang(lang) {
  if (!LANGUAGES[lang]) return;
  _currentLang = lang;
  localStorage.setItem('solar-system-lang', lang);
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

export function getLang() {
  return _currentLang;
}

export function getLangData(lang) {
  return LANGUAGES[lang || _currentLang];
}

export function getAllLangs() {
  return Object.keys(LANGUAGES);
}
