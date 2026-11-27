#!/usr/bin/env python3
"""
Roost and Rest Stays - Complete Portfolio PDF Engine
Builds 300 DPI Ultra-HD Branded PDFs for all properties in Roost and Rest portfolio.
Host / Director: Mr. Anwar Ahmad (+91 9807486555)
"""

import os
import sys
import time
import glob
import urllib.request
import re
import json
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageEnhance, ImageFilter
import img2pdf

BASE_DIR = '/Users/praveen/Developer/Partner Property PDFs/Roost and Rest'
ROOST_REPO = '/Users/praveen/Developer/RoostAndRest.github.io'
LOGO_PATH = os.path.join(ROOST_REPO, 'assets', 'logo-crest.png')
CACHE_ROOT = os.path.join(BASE_DIR, 'portfolio_cache')

os.makedirs(BASE_DIR, exist_ok=True)
os.makedirs(CACHE_ROOT, exist_ok=True)

# Load properties from property_images.json
with open(os.path.join(ROOST_REPO, 'property_images.json'), 'r') as f:
    PROPERTIES_DICT = json.load(f)

def sanitize_filename(name):
    clean = re.sub(r'[/\\:*?"<>|]', '', name)
    clean = clean.replace(' : ', ' - ').replace(':', ' - ')
    return clean.strip()

def fetch_airbnb_photos(room_id, save_dir, fallback_img=None):
    os.makedirs(save_dir, exist_ok=True)
    existing = sorted(glob.glob(os.path.join(save_dir, 'photo_*.jpg')))
    if len(existing) >= 10:
        return existing

    if not str(room_id).isdigit():
        if fallback_img:
            dst = os.path.join(save_dir, 'photo_01.jpg')
            try:
                urllib.request.urlretrieve(fallback_img, dst)
                return [dst]
            except Exception:
                pass
        return existing

    url = f"https://www.airbnb.co.in/rooms/{room_id}"
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error fetching room {room_id}: {e}")
        if fallback_img:
            dst = os.path.join(save_dir, 'photo_01.jpg')
            try:
                urllib.request.urlretrieve(fallback_img, dst)
                return [dst]
            except Exception:
                pass
        return existing

    pics = list(set(re.findall(r'https://a0\.muscache\.com/im/pictures/hosting/Hosting-[0-9]+/original/[a-f0-9\-]+\.jpeg', html)))
    if not pics:
        pics = list(set(re.findall(r'https://a0\.muscache\.com/im/pictures/miso/Hosting-[0-9]+/original/[a-f0-9\-]+\.jpeg', html)))
    if not pics:
        pics = list(set(re.findall(r'https://a0\.muscache\.com/im/pictures/[a-f0-9\-]+\.jpg', html)))

    downloaded = []
    for i, p in enumerate(pics[:35]):
        dst = os.path.join(save_dir, f'photo_{i+1:02d}.jpg')
        if not os.path.exists(dst):
            try:
                urllib.request.urlretrieve(p, dst)
            except Exception:
                pass
        if os.path.exists(dst):
            downloaded.append(dst)

    if not downloaded and fallback_img:
        dst = os.path.join(save_dir, 'photo_01.jpg')
        try:
            urllib.request.urlretrieve(fallback_img, dst)
            downloaded.append(dst)
        except Exception:
            pass

    return sorted(downloaded)

def enhance_photo(in_p, out_p):
    try:
        im = Image.open(in_p).convert('RGB')
        w, h = im.size
        long_edge = max(w, h)
        if long_edge < 2200:
            scale = min(2.5, 2400.0 / long_edge)
            im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        im = ImageEnhance.Color(im).enhance(1.08)
        im = ImageEnhance.Contrast(im).enhance(1.05)
        im = im.filter(ImageFilter.UnsharpMask(radius=1.8, percent=130, threshold=2))
        im.save(out_p, 'JPEG', quality=92, subsampling=0)
        return True
    except Exception:
        return False

def create_roost_cover_page(item, hero_path, cache_dir):
    W, H = 2480, 3508  # 300 DPI A4
    im = Image.new('RGB', (W, H), '#FFFFFF')
    draw = ImageDraw.Draw(im)

    f_georgia_b = '/System/Library/Fonts/Supplemental/Georgia Bold.ttf'
    f_georgia = '/System/Library/Fonts/Supplemental/Georgia.ttf'
    f_arial_b = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
    f_arial = '/System/Library/Fonts/Supplemental/Arial.ttf'

    font_brand = ImageFont.truetype(f_georgia_b, 62)
    font_brand_sub = ImageFont.truetype(f_arial_b, 32)
    font_tagline = ImageFont.truetype(f_georgia, 36)
    font_title = ImageFont.truetype(f_georgia_b, 74)
    font_type = ImageFont.truetype(f_arial_b, 42)
    font_loc = ImageFont.truetype(f_arial_b, 36)
    font_specs = ImageFont.truetype(f_arial_b, 34)
    font_contact_name = ImageFont.truetype(f_arial_b, 36)
    font_contact_sub = ImageFont.truetype(f_arial, 27)
    font_contact_num = ImageFont.truetype(f_arial_b, 36)

    # 1. Header (Deep Obsidian Navy with Teal/Cyan Branding)
    header_h = 300
    draw.rectangle([(0, 0), (W, header_h)], fill='#0F172A')

    # Paste Logo
    logo_size = 230
    if os.path.exists(LOGO_PATH):
        try:
            logo = Image.open(LOGO_PATH).convert('RGBA')
            logo.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
            im.paste(logo, (120, 36), logo)
        except Exception as e:
            print("Logo error:", e)

    draw.text((390, 62), 'ROOST AND REST', fill='#FFFFFF', font=font_brand)
    draw.text((390, 145), 'BOUTIQUE STAYS & LUXURY HOMESTAYS', fill='#0284C7', font=font_brand_sub)
    draw.text((390, 200), '“Your Home in the City of Nawabs”', fill='#94A3B8', font=font_tagline)

    # 2. Cyan / Teal Divider Accent
    draw.rectangle([(0, header_h), (W, header_h + 16)], fill='#0284C7')

    # 3. Property Title & Type
    name = item['name'].upper()
    draw.text((120, 360), name, fill='#0F172A', font=font_title)
    draw.text((120, 475), 'Boutique Serviced Homestay · Fully Air-Conditioned', fill='#0284C7', font=font_type)

    # 4. Location Badge
    draw.rounded_rectangle([(120, 560), (W - 120, 680)], radius=18, fill='#F0F9FF', outline='#BAE6FD', width=3)
    loc_text = "📍 Location: Lucknow, Uttar Pradesh, India"
    draw.text((160, 598), loc_text, fill='#0369A1', font=font_loc)

    # 5. Hero Photo
    target_w = W - 240
    target_h = 1980
    if os.path.exists(hero_path):
        try:
            hero = Image.open(hero_path).convert('RGB')
            hero = ImageEnhance.Color(hero).enhance(1.10)
            hero = ImageEnhance.Contrast(hero).enhance(1.06)
            hero_fitted = ImageOps.fit(hero, (target_w, target_h), Image.Resampling.LANCZOS)
            hero_fitted = hero_fitted.filter(ImageFilter.UnsharpMask(radius=2.0, percent=140, threshold=2))
            im.paste(hero_fitted, (120, 720))
            draw.rounded_rectangle([(120, 720), (120 + target_w, 720 + target_h)], radius=24, outline='#0F172A', width=4)
        except Exception:
            pass

    # 6. Specs Bar
    box_y = 2750
    box_h = 155
    draw.rounded_rectangle([(120, box_y), (W - 120, box_y + box_h)], radius=18, fill='#0F172A')
    draw.text((165, box_y + 54), '🛡️ Superhost Verified    🛏️ Luxury Bedrooms    🚿 Attached Baths    📶 High-Speed Wi-Fi    ❄️ 100% AC', fill='#F8FAFC', font=font_specs)

    # 7. Partner Footer
    foot_y = H - 540
    draw.rectangle([(0, foot_y), (W, H)], fill='#F8FAFC')
    draw.line([(120, foot_y), (W - 120, foot_y)], fill='#E2E8F0', width=3)
    draw.text((120, foot_y + 36), '🛡️ Verified Boutique Stay — Roost and Rest Stays (Roots & Rest)', fill='#0F172A', font=ImageFont.truetype(f_georgia_b, 35))
    draw.text((120, foot_y + 96), 'GST Regd: 09BQVPA3404Q1ZB · Dedicated Ground Caretaker · Professional Daily Housekeeping', fill='#64748B', font=ImageFont.truetype(f_arial, 29))

    # Contact Cards
    card_y = foot_y + 170
    card_w = (W - 240 - 50) // 2
    card_h = 210

    # Card 1: Mr. Anwar Ahmad
    draw.rounded_rectangle([(120, card_y), (120 + card_w, card_y + card_h)], radius=18, fill='#FFFFFF', outline='#0284C7', width=3)
    draw.text((160, card_y + 30), '👤 Mr. Anwar Ahmad (Director)', fill='#0F172A', font=font_contact_name)
    draw.text((160, card_y + 90), '📞 Direct Helpline & WhatsApp:', fill='#64748B', font=font_contact_sub)
    draw.text((160, card_y + 135), '+91 98074 86555', fill='#0284C7', font=font_contact_num)

    # Card 2: Central Reservations
    c2_x = 120 + card_w + 50
    draw.rounded_rectangle([(c2_x, card_y), (c2_x + card_w, card_y + card_h)], radius=18, fill='#FFFFFF', outline='#0284C7', width=3)
    draw.text((c2_x + 40, card_y + 30), '🏢 Roost & Rest Reservations', fill='#0F172A', font=font_contact_name)
    draw.text((c2_x + 40, card_y + 90), '✉️ Official Support Email:', fill='#64748B', font=font_contact_sub)
    draw.text((c2_x + 40, card_y + 135), 'theroostandrestlucknow@gmail.com', fill='#0284C7', font=ImageFont.truetype(f_arial_b, 28))

    cover_p = os.path.join(cache_dir, '00_cover_300dpi.jpg')
    im.save(cover_p, 'JPEG', quality=99, subsampling=0)
    return cover_p

def build_single_property_pdf(code, item):
    slug = code.lower().replace('-', '_')
    prop_cache = os.path.join(CACHE_ROOT, slug)
    os.makedirs(prop_cache, exist_ok=True)
    
    clean_name = sanitize_filename(item['name'])
    pdf_filename = f"{clean_name} ({code}) - Roost and Rest.pdf"
    
    print(f"\n=======================================================")
    print(f"🚀 [{code}] Processing: {item['name']}")
    print(f"🔗 Airbnb Room ID: {item.get('id')}")
    print(f"=======================================================")

    raw_dir = os.path.join(prop_cache, 'raw_photos')
    photos = fetch_airbnb_photos(item.get('id'), raw_dir, item.get('imageUrl'))
    if not photos:
        print(f"❌ No photos found for {code}")
        return False, 0, 0

    hero_path = photos[0]
    cover_page = create_roost_cover_page(item, hero_path, prop_cache)

    enhanced_dir = os.path.join(prop_cache, 'enhanced')
    os.makedirs(enhanced_dir, exist_ok=True)
    all_pages = [cover_page]
    for i, p in enumerate(photos):
        dst = os.path.join(enhanced_dir, f"enh_{i+1:02d}.jpg")
        if not os.path.exists(dst):
            enhance_photo(p, dst)
        all_pages.append(dst)

    out_pdf = os.path.join(BASE_DIR, pdf_filename)
    a4_portrait = (img2pdf.mm_to_pt(210), img2pdf.mm_to_pt(297))
    a4_landscape = (img2pdf.mm_to_pt(297), img2pdf.mm_to_pt(210))
    fun_p = img2pdf.get_layout_fun(a4_portrait)
    fun_l = img2pdf.get_layout_fun(a4_landscape)

    def dynamic_layout(w, h, ndpi):
        if w > h:
            return fun_l(w, h, ndpi)
        else:
            return fun_p(w, h, ndpi)

    with open(out_pdf, 'wb') as f:
        f.write(img2pdf.convert(all_pages, layout_fun=dynamic_layout))

    mb = os.path.getsize(out_pdf) / (1024 * 1024)
    print(f"🎉 SUCCESS: Generated '{pdf_filename}' ({mb:.2f} MB, {len(all_pages)} pages)")
    return True, mb, len(all_pages)

def main():
    print("🌟 ROOST AND REST STAYS — PORTFOLIO PDF GENERATOR ENGINE 🌟")
    print(f"Total properties: {len(PROPERTIES_DICT)}")
    results = []
    for code, item in sorted(PROPERTIES_DICT.items()):
        success, mb, pages = build_single_property_pdf(code, item)
        if success:
            clean_name = sanitize_filename(item['name'])
            results.append((f"{clean_name} ({code})", mb, pages))

    print("\n" + "="*80)
    print("🏁 ROOST AND REST PORTFOLIO REPORT — ALL PDFs COMPILED")
    print("="*80)
    for fname, mb, p in results:
        print(f" • {fname:<60} | {mb:>6.2f} MB | {p:>2} pages")
    print("="*80)

if __name__ == '__main__':
    main()
