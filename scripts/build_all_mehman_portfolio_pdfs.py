#!/usr/bin/env python3
"""
Mehman Heritage Stay & Hospitality - Complete Portfolio PDF Engine
Compiles 300 DPI Ultra-HD Branded PDFs for ALL properties in the Mehman Heritage portfolio.
Hosts: Ahmed Shadab (+91 80901 40423), Ahmed Shahzad (+91 70073 00213)
"""

import os
import sys
import time
import glob
import urllib.request
import re
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageEnhance, ImageFilter
import img2pdf

BASE_DIR = '/Users/praveen/Developer/Partner Property PDFs/Mehman Heritage'
LOGO_PATH = '/Users/praveen/Developer/airbnbmanager.github.io/assets/partners/mehman-heritage/mehman_heritage_orange_logo.jpg'
CACHE_ROOT = os.path.join(BASE_DIR, 'portfolio_cache')

os.makedirs(BASE_DIR, exist_ok=True)
os.makedirs(CACHE_ROOT, exist_ok=True)

PROPERTIES = [
    {
        'slug': 'lucknow_central_1bhk_charbagh',
        'room_id': '1675836659693641696',
        'display_name': 'LUCKNOW CENTRAL | 1 BHK CHARBAGH',
        'type': '1 BHK Executive Suite · 1 King Bed · Fully Air-Conditioned',
        'location': 'Near Charbagh Railway Station, Lucknow, Uttar Pradesh',
        'specs': '⭐ 4.78 Rating    🛏️ 1 King Bed    🚿 1 Bath    👥 Up to 2-3 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'Lucknow Central - 1 BHK Near Charbagh (Mehman Heritage).pdf'
    },
    {
        'slug': 'spacious_2bhk_modern',
        'room_id': '1788393609735825212',
        'display_name': 'SPACIOUS 2 BHK MODERN HOME',
        'type': '2 BHK Modern Luxury Homestay · 3 Beds · 2 Luxury Baths',
        'location': 'Prime Central Location, Lucknow, Uttar Pradesh',
        'specs': '⭐ 5.0 Rating    🛏️ 3 Beds (2 King + Sofa Bed)    🚿 2 Baths    👥 Up to 6 Guests    ❄️ 100% AC',
        'filename': 'Spacious 2BHK - Modern Home in Lucknow (Mehman Heritage).pdf'
    },
    {
        'slug': 'mehman_heritage_4bhk',
        'room_id': '1722367158892891201',
        'display_name': 'THE MEHMAN HERITAGE | 4 BHK',
        'type': '4 BHK Grand City Centre Luxury Home · 5 Beds · 4 Baths',
        'location': 'Near Wave Mall & Bhootnath Metro, Gomti Nagar, Lucknow',
        'specs': '🛏️ 5 Beds (4 King + Sofa Bed)    🚿 4 Luxury Baths    👥 Up to 16 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'The Mehman Heritage - 4 BHK City Centre Luxe Home.pdf'
    },
    {
        'slug': 'the_awadh_retreat',
        'room_id': '1754920271857081441',
        'display_name': 'THE AWADH RETREAT',
        'type': '3 BHK Luxury Homestay · 5 Beds · 3 Attached Baths',
        'location': 'Near Amity University, Nijampur Malhaur, Lucknow',
        'specs': '🛏️ 5 Luxury Beds    🚿 3 Attached Baths    👥 Up to 10 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'The Awadh Retreat - 3 BHK 5 Beds (Near Amity University).pdf'
    },
    {
        'slug': 'the_nivora_nest',
        'room_id': '1754941277309610915',
        'display_name': 'THE NIVORA NEST',
        'type': '3 BHK Designer Boutique Homestay · 3 Baths',
        'location': 'Nijampur Malhaur, Near Amity University, Lucknow',
        'specs': '🛏️ 3 King Bedrooms    🚿 3 Attached Baths    👥 Up to 8-10 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'The Nivora Nest - 3 BHK Cozy Retreat (Near Amity).pdf'
    },
    {
        'slug': 'gateway_of_ramnagari',
        'room_id': '1589934822379222832',
        'display_name': 'GATEWAY OF RAMNAGARI',
        'type': '3 BHK Super Luxury Apartment · Fully Air-Conditioned',
        'location': 'Ramnagari, Prime Residential Sector, Lucknow',
        'specs': '🛏️ 3 Spacious Bedrooms    🚿 3 Baths    👥 Up to 8 Guests    🚗 Parking    ❄️ 100% AC',
        'filename': 'Gateway of Ramnagari - 3 BHK Super Luxury Apt.pdf'
    },
    {
        'slug': 'mehman_heritage_hazratganj_2bhk',
        'room_id': '1668092848739068125',
        'display_name': 'MEHMAN HERITAGE | 2 BHK HAZRATGANJ',
        'type': '2 BHK Guest Favorite Luxury Homestay · Heart of Lucknow',
        'location': 'Near Hazratganj & Gomti Riverfront, Lucknow',
        'specs': '⭐ 4.96 Rating (Guest Favorite)    🛏️ 2 King Beds    🚿 2 Baths    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'Mehman Heritage - 2 BHK Guest Favorite (Near Hazratganj).pdf'
    },
    {
        'slug': 'villa_no_6_lonavala',
        'room_id': '1631538152162421320',
        'display_name': 'VILLA NO. 6 ~ PRIVATE POOL VILLA',
        'type': '3 BHK Grand Holiday Villa with Private Pool',
        'location': 'Karla / Canyon Valley, Lonavala, Maharashtra',
        'specs': '🏊 Private Swimming Pool    🛏️ 3 BHK Villa    🚿 3.5 Baths    👥 Up to 12 Guests    🌳 Lawn & BBQ',
        'filename': 'Villa No 6 - 3 BHK Private Pool Villa (Lonavala).pdf'
    }
]

def fetch_airbnb_photos(room_id, save_dir):
    os.makedirs(save_dir, exist_ok=True)
    existing = sorted(glob.glob(os.path.join(save_dir, 'photo_*.jpg')))
    if len(existing) >= 15:
        return existing
        
    url = f"https://www.airbnb.co.in/rooms/{room_id}"
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error fetching room {room_id}: {e}")
        return existing

    # Find photos
    pics = list(set(re.findall(r'https://a0\.muscache\.com/im/pictures/hosting/Hosting-[0-9]+/original/[a-f0-9\-]+\.jpeg', html)))
    if not pics:
        pics = list(set(re.findall(r'https://a0\.muscache\.com/im/pictures/miso/Hosting-[0-9]+/original/[a-f0-9\-]+\.jpeg', html)))
    if not pics:
        pics = list(set(re.findall(r'https://a0\.muscache\.com/im/pictures/[a-f0-9\-]+\.jpg', html)))

    print(f"   ✓ Found {len(pics)} original CDN photos for {room_id}")
    downloaded = []
    for i, p in enumerate(pics[:35]):  # Up to 35 high-res photos
        dst = os.path.join(save_dir, f'photo_{i+1:02d}.jpg')
        if not os.path.exists(dst):
            try:
                urllib.request.urlretrieve(p, dst)
            except Exception as e:
                pass
        if os.path.exists(dst):
            downloaded.append(dst)
            
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
    except Exception as e:
        return False

def create_cover_page(item, hero_path, cache_dir):
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
    font_title = ImageFont.truetype(f_georgia_b, 76)
    font_type = ImageFont.truetype(f_arial_b, 42)
    font_loc = ImageFont.truetype(f_arial_b, 36)
    font_specs = ImageFont.truetype(f_arial_b, 34)
    font_contact_name = ImageFont.truetype(f_arial_b, 36)
    font_contact_sub = ImageFont.truetype(f_arial, 27)
    font_contact_num = ImageFont.truetype(f_arial_b, 36)

    # 1. Header
    header_h = 300
    draw.rectangle([(0, 0), (W, header_h)], fill='#0F172A')

    logo_size = 230
    if os.path.exists(LOGO_PATH):
        try:
            logo = Image.open(LOGO_PATH).convert('RGB')
            logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
            mask = Image.new('L', (logo_size, logo_size), 0)
            mask_draw = ImageDraw.Draw(mask)
            mask_draw.rounded_rectangle([(0, 0), (logo_size, logo_size)], radius=36, fill=255)
            draw.rounded_rectangle([(114, 30), (126 + logo_size, 42 + logo_size)], radius=40, fill='#F59E0B')
            im.paste(logo, (120, 36), mask)
        except Exception:
            pass

    draw.text((390, 62), 'MEHMAN HERITAGE', fill='#FFFFFF', font=font_brand)
    draw.text((390, 145), 'STAY & HOSPITALITY', fill='#F59E0B', font=font_brand_sub)
    draw.text((390, 200), '“Where guests become family”', fill='#FDBA74', font=font_tagline)

    # 2. Saffron Divider
    draw.rectangle([(0, header_h), (W, header_h + 16)], fill='#EA580C')

    # 3. Title & Type
    draw.text((120, 360), item['display_name'], fill='#0F172A', font=font_title)
    draw.text((120, 475), item['type'], fill='#C2410C', font=font_type)

    # 4. Location Badge
    draw.rounded_rectangle([(120, 560), (W - 120, 680)], radius=18, fill='#FFF7ED', outline='#FDBA74', width=3)
    loc_text = f"📍 Location: {item['location']}"
    draw.text((160, 598), loc_text, fill='#9A3412', font=font_loc)

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
        except Exception as e:
            pass

    # 6. Specs Bar
    box_y = 2750
    box_h = 155
    draw.rounded_rectangle([(120, box_y), (W - 120, box_y + box_h)], radius=18, fill='#0F172A')
    draw.text((165, box_y + 54), item['specs'], fill='#FFF7ED', font=font_specs)

    # 7. Partner Footer
    foot_y = H - 540
    draw.rectangle([(0, foot_y), (W, H)], fill='#FDFBF7')
    draw.line([(120, foot_y), (W - 120, foot_y)], fill='#FED7AA', width=3)
    draw.text((120, foot_y + 36), '🛡️ Verified Luxury Stay — Mehman Heritage Stay & Hospitality', fill='#0F172A', font=ImageFont.truetype(f_georgia_b, 35))
    draw.text((120, foot_y + 96), 'Dedicated Caretaker · Professional Daily Housekeeping · 100% Sanitized Linens · High-Speed Wi-Fi', fill='#78350F', font=ImageFont.truetype(f_arial, 29))

    # Contact Cards
    card_y = foot_y + 170
    card_w = (W - 240 - 50) // 2
    card_h = 210

    # Card 1: Ahmed Shadab
    draw.rounded_rectangle([(120, card_y), (120 + card_w, card_y + card_h)], radius=18, fill='#FFFFFF', outline='#EA580C', width=3)
    draw.text((160, card_y + 30), '👤 Ahmed Shadab', fill='#0F172A', font=font_contact_name)
    draw.text((160, card_y + 90), '📞 Direct Call & WhatsApp:', fill='#78350F', font=font_contact_sub)
    draw.text((160, card_y + 135), '+91 80901 40423', fill='#C2410C', font=font_contact_num)

    # Card 2: Ahmed Shahzad
    c2_x = 120 + card_w + 50
    draw.rounded_rectangle([(c2_x, card_y), (c2_x + card_w, card_y + card_h)], radius=18, fill='#FFFFFF', outline='#EA580C', width=3)
    draw.text((c2_x + 40, card_y + 30), '👤 Ahmed Shahzad', fill='#0F172A', font=font_contact_name)
    draw.text((c2_x + 40, card_y + 90), '📞 Direct Call & WhatsApp:', fill='#78350F', font=font_contact_sub)
    draw.text((c2_x + 40, card_y + 135), '+91 70073 00213', fill='#C2410C', font=font_contact_num)

    cover_p = os.path.join(cache_dir, '00_cover_300dpi.jpg')
    im.save(cover_p, 'JPEG', quality=99, subsampling=0)
    return cover_p

def build_single_property_pdf(item):
    slug = item['slug']
    prop_cache = os.path.join(CACHE_ROOT, slug)
    os.makedirs(prop_cache, exist_ok=True)
    
    print(f"\n=======================================================")
    print(f"🚀 Processing: {item['display_name']}")
    print(f"📍 Location: {item['location']}")
    print(f"🔗 Airbnb Room ID: {item['room_id']}")
    print(f"=======================================================")

    # 1. Fetch raw photos
    raw_dir = os.path.join(prop_cache, 'raw_photos')
    photos = fetch_airbnb_photos(item['room_id'], raw_dir)
    if not photos:
        print(f"❌ No photos found for {slug}")
        return False, 0, 0

    # 2. Create cover
    hero_path = photos[0]
    cover_page = create_cover_page(item, hero_path, prop_cache)

    # 3. Enhance photos
    enhanced_dir = os.path.join(prop_cache, 'enhanced')
    os.makedirs(enhanced_dir, exist_ok=True)
    all_pages = [cover_page]
    for i, p in enumerate(photos):
        dst = os.path.join(enhanced_dir, f"enh_{i+1:02d}.jpg")
        if not os.path.exists(dst):
            enhance_photo(p, dst)
        all_pages.append(dst)

    # 4. Compile Dynamic PDF
    out_pdf = os.path.join(BASE_DIR, item['filename'])
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
    print(f"🎉 SUCCESS: Generated '{item['filename']}' ({mb:.2f} MB, {len(all_pages)} pages)")
    return True, mb, len(all_pages)

def main():
    print("🌟 MEHMAN HERITAGE — PORTFOLIO PDF GENERATOR ENGINE 🌟")
    results = []
    for item in PROPERTIES:
        success, mb, pages = build_single_property_pdf(item)
        if success:
            results.append((item['filename'], mb, pages))
            
    print("\n" + "="*80)
    print("🏁 PORTFOLIO GENERATION REPORT — ALL PROPERTIES COMPILED")
    print("="*80)
    for fname, mb, p in results:
        print(f" • {fname:<65} | {mb:>6.2f} MB | {p:>2} pages")
    print("="*80)

if __name__ == '__main__':
    main()
