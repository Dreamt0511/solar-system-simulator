#!/usr/bin/env python3
"""
太阳系行星纹理下载脚本
从NASA公开服务器下载高质量行星纹理
"""

import os
import sys
import urllib.request
import zipfile
import shutil
from pathlib import Path

# 纹理下载源（NASA公开数据）
TEXTURES = {
    'earth': {
        'diffuse': 'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg',
        'night': 'https://eoimages.gsfc.nasa.gov/images/imagerecords/79000/79765/dnb_land_ocean_ice.2012.3600x1800.jpg',
    },
    'mars': {
        'diffuse': 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/mars_6k_color.jpg',
    },
    'jupiter': {
        'diffuse': 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/jupiter_6k.jpg',
    },
    'saturn': {
        'diffuse': 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/saturn_6k.jpg',
        'ring': 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/saturn_ring.png',
    },
}

# 备用纹理（较小，确保能下载）
BACKUP_TEXTURES = {
    'earth': {
        'diffuse': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Blue_Marble_2002.png/1280px-Blue_Marble_2002.png',
    },
    'mars': {
        'diffuse': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Mars_-_August_30_2021_-_Flickr_-_Kevin_M._Gill.png/1280px-Mars_-_August_30_2021_-_Flickr_-_Kevin_M._Gill.png',
    },
    'jupiter': {
        'diffuse': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Jupiter_New_Horizons.jpg/1280px-Jupiter_New_Horizons.jpg',
    },
    'saturn': {
        'diffuse': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/1280px-Saturn_during_Equinox.jpg',
    },
}

def create_directories(base_path):
    """创建纹理目录结构"""
    planets = ['earth', 'mars', 'jupiter', 'saturn', 'venus', 'mercury', 'uranus', 'neptune']
    for planet in planets:
        dir_path = os.path.join(base_path, planet)
        os.makedirs(dir_path, exist_ok=True)
    print("✓ 目录结构已创建")

def download_file(url, dest_path, timeout=60):
    """下载文件"""
    try:
        print(f"  下载中: {os.path.basename(dest_path)}...")

        # 创建请求
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Solar System Simulator)'
        })

        # 下载
        with urllib.request.urlopen(req, timeout=timeout) as response:
            with open(dest_path, 'wb') as f:
                shutil.copyfileobj(response, f)

        file_size = os.path.getsize(dest_path)
        print(f"  ✓ 完成: {file_size / 1024 / 1024:.2f} MB")
        return True

    except Exception as e:
        print(f"  ✗ 失败: {e}")
        return False

def download_planet_textures(planet, urls, base_path, use_backup=False):
    """下载单个行星的所有纹理"""
    print(f"\n{'='*50}")
    print(f"下载 {planet.upper()} 纹理")
    print(f"{'='*50}")

    planet_dir = os.path.join(base_path, planet)
    success_count = 0
    total_count = len(urls)

    for texture_type, url in urls.items():
        # 确定文件扩展名
        ext = url.split('.')[-1].split('?')[0]
        if ext not in ['jpg', 'jpeg', 'png']:
            ext = 'jpg'

        dest_path = os.path.join(planet_dir, f"{texture_type}.{ext}")

        # 跳过已存在的文件
        if os.path.exists(dest_path):
            print(f"  跳过 {texture_type} (已存在)")
            success_count += 1
            continue

        if download_file(url, dest_path):
            success_count += 1

    return success_count == total_count

def download_all_textures(base_path, use_backup=False):
    """下载所有纹理"""
    print("\n" + "="*60)
    print("太阳系行星纹理下载器")
    print("="*60)

    if use_backup:
        print("\n使用备用源（较小文件）")
        textures = BACKUP_TEXTURES
    else:
        print("\n使用NASA源（高质量）")
        textures = TEXTURES

    # 创建目录
    create_directories(base_path)

    # 统计
    total_planets = len(textures)
    success_planets = 0

    # 下载每个行星
    for planet, urls in textures.items():
        if download_planet_textures(planet, urls, base_path, use_backup):
            success_planets += 1

    # 总结
    print("\n" + "="*60)
    print(f"下载完成: {success_planets}/{total_planets} 行星")
    print("="*60)

    if success_planets < total_planets:
        print("\n部分纹理下载失败，程序将使用程序化生成的替代纹理")
        return False

    return True

def main():
    # 获取脚本所在目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    textures_dir = os.path.join(script_dir, 'textures')

    # 检查参数
    use_backup = '--backup' in sys.argv or '-b' in sys.argv

    if '--help' in sys.argv or '-h' in sys.argv:
        print("用法: python download_textures.py [选项]")
        print("\n选项:")
        print("  --backup, -b    使用备用源（较小文件，下载更快）")
        print("  --help, -h      显示此帮助信息")
        print("\n说明:")
        print("  从NASA服务器下载高质量行星纹理")
        print("  纹理将保存到 textures/ 目录")
        return

    # 检查是否已存在纹理
    if os.path.exists(textures_dir):
        existing = sum(1 for f in os.listdir(textures_dir) if os.path.isdir(os.path.join(textures_dir, f)))
        if existing > 0:
            print(f"\n检测到已存在 {existing} 个行星纹理目录")
            response = input("是否重新下载？(y/N): ").strip().lower()
            if response != 'y':
                print("跳过下载")
                return

    # 开始下载
    try:
        success = download_all_textures(textures_dir, use_backup)

        if success:
            print("\n✓ 所有纹理下载完成！")
            print(f"纹理位置: {textures_dir}")
        else:
            print("\n⚠ 部分纹理下载失败")
            print("程序将使用程序化生成的替代纹理")

    except KeyboardInterrupt:
        print("\n\n下载已取消")
        sys.exit(1)
    except Exception as e:
        print(f"\n错误: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
