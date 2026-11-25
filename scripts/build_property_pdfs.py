#!/usr/bin/env python3
"""
Download all property images for all 20 properties and generate high-quality,
lightweight PDFs matching existing files in '/Users/praveen/Developer/Property PDFs'.
"""

import os
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
import img2pdf
from PIL import Image

BASE_DIR = '/Users/praveen/Developer/Property PDFs'
SHOWCASE_DATA_PATH = '/Users/praveen/Developer/airbnbmanager.github.io/js/showcase-data.js'
DIRECTORY_PHOTOS_PATH = '/Users/praveen/Developer/airbnbmanager.github.io/js/directory-photos.js'

PROPERTIES = [
    {'name': 'The Luxe Haven', 'slug': 'the-luxe-haven'},
    {'name': 'The Dark Blue', 'slug': 'the-dark-blue'},
    {'name': 'The Unique', 'slug': 'the-unique'},
    {'name': 'Black Beauty', 'slug': 'black-beauty'},
    {'name': 'RedRose Palace', 'slug': 'redrose-palace'},
    {'name': 'The Brown', 'slug': 'the-brown'},
    {'name': 'The Light Green', 'slug': 'the-light-green'},
    {'name': 'The Nawabi Stay', 'slug': 'the-nawabi-stay'},
    {'name': 'Starlight Blue PentHouse', 'slug': 'starlight-blue-penthouse'},
    {'name': 'The Yellow House', 'slug': 'the-yellow-house'},
    {'name': 'The Green House', 'slug': 'the-green-house'},
    {'name': 'The Pink House', 'slug': 'the-pink-house'},
    {'name': 'Gomti Grand Villa', 'slug': 'gomti-grand-villa'},
    {'name': 'Royal White House', 'slug': 'royal-white-house'},
    {'name': 'Celebrity Garden', 'slug': 'celebrity-garden'},
    {'name': 'The Velvet House', 'slug': 'the-velvet-house'},
    {'name': 'Green Forest', 'slug': 'green-forest'},
    {'name': 'Pink Paradise', 'slug': 'pink-paradise'},
    {'name': 'The Tehzeeb Nest', 'slug': 'the-tehzeeb-nest'},
    {'name': 'Sukoon Stay', 'slug': 'sukoon-stay'}
]

def load_photos(slug, showcase_text, directory_text):
    photos = []
    
    # 1. Check directory-photos.js
    m = re.search(rf'\"{slug}\":\s*\{{(.*?)\n  \}}', directory_text, re.DOTALL)
    if m:
        for p in re.findall(r'https://[^\s\",\']+', m.group(1)):
            if 'muscache.com' in p:
                base = p.split('?')[0]
                if base not in photos:
                    photos.append(base)
                    
    # 2. Check showcase-data.js
    idx = showcase_text.find(f"slug: '{slug}'")
    if idx == -1:
        idx = showcase_text.find(f'slug: "{slug}"')
    if idx != -1:
        next_idx = showcase_text.find('slug:', idx + 10)
        chunk = showcase_text[idx:next_idx] if next_idx != -1 else showcase_text[idx:idx+50000]
        for p in re.findall(r'https://[^\s\",\']+', chunk):
            if 'muscache.com' in p:
                base = p.split('?')[0]
                if base not in photos:
                    photos.append(base)
                    
    return photos

def download_image(url, out_path):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
    # Append high-res query parameter
    full_url = f"{url}?im_w=1200"
    req = urllib.request.Request(full_url, headers=headers)
    
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()
                if len(data) > 1000 and data[:2] == b'\xff\xd8':
                    with open(out_path, 'wb') as f:
                        f.write(data)
                    return True, out_path, len(data)
        except Exception:
            time.sleep(1)
            
    # Fallback without query parameter
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
            if len(data) > 1000:
                with open(out_path, 'wb') as f:
                    f.write(data)
                return True, out_path, len(data)
    except Exception as e:
        return False, out_path, str(e)
        
    return False, out_path, 'Failed after 3 attempts'

def process_property(prop, showcase_text, directory_text):
    name = prop['name']
    slug = prop['slug']
    print(f"\n==================================================")
    print(f"🏠 Starting Processing: {name} ({slug})")
    print(f"==================================================")
    
    # 1. Target folders
    prop_folder = os.path.join(BASE_DIR, name)
    os.makedirs(prop_folder, exist_ok=True)
    pdf_path = os.path.join(BASE_DIR, f"{name}.pdf")
    
    # 2. Extract photo URLs
    photo_urls = load_photos(slug, showcase_text, directory_text)
    print(f"📸 Total unique photo URLs identified: {len(photo_urls)}")
    if not photo_urls:
        print(f"❌ Error: No photos found for {name}")
        return False
        
    # 3. Parallel download into property folder
    tasks = []
    out_files = []
    with ThreadPoolExecutor(max_workers=15) as executor:
        for i, url in enumerate(photo_urls, 1):
            fname = f"{i:02d}.jpg"
            out_path = os.path.join(prop_folder, fname)
            out_files.append(out_path)
            # Only download if not already downloaded or empty
            if not os.path.exists(out_path) or os.path.getsize(out_path) < 1000:
                tasks.append(executor.submit(download_image, url, out_path))
                
        completed = 0
        total = len(tasks)
        if total > 0:
            print(f"📥 Downloading {total} photos with 15 parallel threads...")
            for future in as_completed(tasks):
                success, path, res = future.result()
                completed += 1
                if success:
                    if completed % 15 == 0 or completed == total:
                        print(f"   ✓ Progress: {completed}/{total} photos downloaded ({os.path.basename(path)})")
                else:
                    print(f"   ⚠️ Failed: {path} -> {res}")
        else:
            print(f"⚡ All {len(out_files)} photos already downloaded in folder.")
            
    # 4. Verify downloaded images
    valid_images = []
    for f in out_files:
        if os.path.exists(f) and os.path.getsize(f) > 1000:
            try:
                with Image.open(f) as img:
                    img.verify()
                valid_images.append(f)
            except Exception as e:
                print(f"   ⚠️ Skipping invalid image {f}: {e}")
                
    print(f"✅ Verified {len(valid_images)} valid JPEG images for {name}.")
    
    # 5. Build PDF using img2pdf
    print(f"📄 Compiling {len(valid_images)} images into PDF: {os.path.basename(pdf_path)}...")
    t0 = time.time()
    try:
        # Layout: standard A4 auto-fit
        a4inpt = (img2pdf.mm_to_pt(210), img2pdf.mm_to_pt(297))
        layout_fun = img2pdf.get_layout_fun(a4inpt)
        
        pdf_bytes = img2pdf.convert(valid_images, layout_fun=layout_fun)
        with open(pdf_path, 'wb') as f:
            f.write(pdf_bytes)
            
        pdf_size_mb = os.path.getsize(pdf_path) / (1024 * 1024)
        print(f"🎉 Generated {pdf_path} ({pdf_size_mb:.2f} MB, {len(valid_images)} pages) in {time.time()-t0:.2f}s")
        return True, pdf_size_mb, len(valid_images)
    except Exception as e:
        print(f"❌ Failed to build PDF for {name}: {e}")
        return False, 0, 0

def main():
    print(f"🚀 Initializing Portfolio Image Downloader & PDF Generator (20 Homestays)")
    print(f"📁 Output Base Directory: {BASE_DIR}")
    
    with open(SHOWCASE_DATA_PATH, 'r', encoding='utf-8') as f:
        showcase_text = f.read()
    with open(DIRECTORY_PHOTOS_PATH, 'r', encoding='utf-8') as f:
        directory_text = f.read()
        
    results = []
    for prop in PROPERTIES:
        success, mb, pages = process_property(prop, showcase_text, directory_text)
        if success:
            results.append((prop['name'], mb, pages))
            
    print(f"\n" + "="*60)
    print(f"🏁 PORTFOLIO SUMMARY: Successfully built {len(results)}/{len(PROPERTIES)} Properties!")
    print(f"="*60)
    total_size = 0
    total_pages = 0
    for name, mb, pages in results:
        total_size += mb
        total_pages += pages
        print(f" • {name:<30} | {mb:>6.2f} MB | {pages:>3} pages")
    print(f"-"*60)
    print(f"Total Portfolio Footprint: {total_size:.2f} MB across {total_pages} high-res pages.")
    print(f"="*60)

if __name__ == '__main__':
    main()
