import { getLang, getLangData } from './i18n.js';

const LIST_ITEMS = [
  { key: 'sun', label: '太阳', color: '#ff7a1f' },
  { key: 'mercury', label: '水星', color: '#8c7e6d' },
  { key: 'venus', label: '金星', color: '#e6c88a' },
  { key: 'earth', label: '地球', color: '#2266cc' },
  { key: 'moon', label: '月球', color: '#999999' },
  { key: 'mars', label: '火星', color: '#b45a32' },
  { key: 'ceres', label: '谷神星', color: '#7a8a9a' },
  { key: 'jupiter', label: '木星', color: '#c8a882' },
  { key: 'saturn', label: '土星', color: '#ead6a6' },
  { key: 'uranus', label: '天王星', color: '#72b5c4' },
  { key: 'neptune', label: '海王星', color: '#3f54ba' },
  { key: 'pluto', label: '冥王星', color: '#bfb0a0' },
  { key: 'asteroidBelt', label: '小行星带', color: '#9a8468' },
  { key: 'halley', label: '哈雷彗星', color: '#66aadd' },
	  { key: 'iss', label: '国际空间站 ISS', color: '#cccccc' },
	  { key: 'tiangong', label: '中国空间站 天宫', color: '#ddeeff' },
	  { key: 'voyager', label: '旅行者一号', color: '#ddb833' },
];

export class PlanetList {
  constructor(targets, cameraController) {
    this.targets = targets;
    this.cameraController = cameraController;
    this.isExpanded = false;
    this.selectedKey = null;

    this.toggleBtn = document.getElementById('planet-list-toggle');
    this.panel = document.getElementById('planet-list-panel');
    this.itemsContainer = document.getElementById('planet-list-items');

    this.render();
    this.bindEvents();
  }

  render() {
    const listData = getLangData(getLang()).listItems;
    LIST_ITEMS.forEach(item => {
      const el = document.createElement('div');
      el.className = 'planet-list-item';
      el.dataset.key = item.key;
      const label = listData[item.key] || item.key;
      el.innerHTML = [
        '<span class="planet-list-dot" style="background:' + item.color + '"></span>',
        '<span class="planet-list-label" data-i18n="listItems.' + item.key + '">' + label + '</span>'
      ].join('');
      this.itemsContainer.appendChild(el);
    });
  }

  bindEvents() {
    this.toggleBtn.addEventListener('click', () => this.toggle());

    this.itemsContainer.addEventListener('click', (e) => {
      const item = e.target.closest('.planet-list-item');
      if (!item) return;
      this.select(item.dataset.key);
    });

    // 手动点击3D行星时同步列表高亮
    window.addEventListener('planetSelected', (e) => {
      const key = e.detail.key;
      if (key) this.highlight(key);
    });

    window.addEventListener('planetDeselected', () => {
      this.highlight(null);
    });
  }

  highlight(key) {
    this.selectedKey = key;
    this.itemsContainer.querySelectorAll('.planet-list-item').forEach(el => {
      el.classList.toggle('active', el.dataset.key === key);
    });
  }

  toggle() {
    this.isExpanded = !this.isExpanded;
    this.panel.classList.toggle('hidden', !this.isExpanded);
    this.toggleBtn.classList.toggle('active', this.isExpanded);
  }

  select(key) {
    this.selectedKey = key;

    this.itemsContainer.querySelectorAll('.planet-list-item').forEach(el => {
      el.classList.toggle('active', el.dataset.key === key);
    });

    const target = this.targets[key];
    if (target) {
      this.cameraController.selectPlanet(target, true);
    }

    if (window.innerWidth < 768) {
      this.toggle();
    }
  }
}
