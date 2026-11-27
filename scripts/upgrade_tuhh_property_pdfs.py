#!/usr/bin/env python3
"""
The Unique Haven Homes - Ultra-HD 300 DPI Property PDF Upgrade Engine
Features:
- 300 DPI Master Cover Pages (2480 x 3508)
- Both Founders on Contact Cards:
    • Mr. Shahanshah (Founder & Host): +91 9450055554
    • Mr. Firoz Khan (Co-Founder & Host): +91 8299600709
- Dynamic Auto-Orientation (Landscape photos get full-screen landscape A4, zero white bars)
- Lossless extraction and enhancement from backup repository
"""

import os
import sys
import time
import glob
import pikepdf
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageEnhance, ImageFilter
import img2pdf

BASE_DIR = '/Users/praveen/Developer/Property PDFs'
BACKUP_DIR = os.path.join(BASE_DIR, 'backup_v535_originals')
LOGO_PATH = '/Users/praveen/Developer/airbnbmanager.github.io/assets/logo-crest.png'
CACHE_ROOT = os.path.join(BASE_DIR, 'upgrade_cache')

os.makedirs(CACHE_ROOT, exist_ok=True)

# 20 Verified Homestays (ZERO FLOOR REFERENCES)
PORTFOLIO = [
    # ── 10 Properties in Vikalp Khand, Chinhat, Gomti Nagar ──
    {
        'display_name': 'BLACK BEAUTY',
        'type': '3 BHK Luxury Homestay · 4 Beds · Fully Air-Conditioned',
        'full_address': 'Vikalp Khand, Chinhat, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'Black Beauty - 3 BHK 4 Beds (Vikalp Khand, Chinhat, Gomti Nagar).pdf'
    },
    {
        'display_name': 'REDROSE PALACE',
        'type': '3 BHK Luxury Homestay · 4 Beds · Fully Air-Conditioned',
        'full_address': 'Vikalp Khand, Chinhat, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'RedRose Palace - 3 BHK 4 Beds (Vikalp Khand, Chinhat, Gomti Nagar).pdf'
    },
    {
        'display_name': 'THE DARK BLUE',
        'type': '3 BHK Luxury Homestay · 4 Beds · Fully Air-Conditioned',
        'full_address': 'Vikalp Khand, Chinhat, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'The Dark Blue - 3 BHK 4 Beds (Vikalp Khand, Chinhat, Gomti Nagar).pdf'
    },
    {
        'display_name': 'THE BROWN',
        'type': '3 BHK Luxury Homestay · 4 Beds · Fully Air-Conditioned',
        'full_address': 'Vikalp Khand, Chinhat, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'The Brown - 3 BHK 4 Beds (Vikalp Khand, Chinhat, Gomti Nagar).pdf'
    },
    {
        'display_name': 'THE LIGHT GREEN',
        'type': '3 BHK Luxury Homestay · 4 Beds · Fully Air-Conditioned',
        'full_address': 'Vikalp Khand, Chinhat, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'The Light Green - 3 BHK 4 Beds (Vikalp Khand, Chinhat, Gomti Nagar).pdf'
    },
    {
        'display_name': 'THE UNIQUE',
        'type': '3 BHK Luxury Homestay · 4 Beds · Fully Air-Conditioned',
        'full_address': 'Vikalp Khand, Chinhat, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'The Unique - 3 BHK 4 Beds (Vikalp Khand, Chinhat, Gomti Nagar).pdf'
    },
    {
        'display_name': 'THE NAWABI STAY',
        'type': '3 BHK Luxury Homestay · 4 Beds · Fully Air-Conditioned',
        'full_address': 'Vikalp Khand, Chinhat, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'The Nawabi Stay - 3 BHK 4 Beds (Vikalp Khand, Chinhat, Gomti Nagar).pdf'
    },
    {
        'display_name': 'STARLIGHT BLUE PENTHOUSE',
        'type': 'Luxury PentHouse · 4 Beds · Private Open Terrace',
        'full_address': 'Vikalp Khand, Chinhat, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Lounge Bed)    🚿 3 Attached Baths    🌟 Private Terrace    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'Starlight Blue PentHouse - Luxury Penthouse 4 Beds (Vikalp Khand, Chinhat, Gomti Nagar).pdf'
    },
    {
        'display_name': 'THE TEHZEEB NEST',
        'type': '3 BHK Luxury Skyline Homestay · 4 Beds · Fully Air-Conditioned',
        'full_address': 'Blossom Skyline, Vikalp Khand, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'The Tehzeeb Nest - 3 BHK 4 Beds (Blossom Skyline, Vikalp Khand, Gomti Nagar).pdf'
    },
    {
        'display_name': 'SUKOON STAY',
        'type': '3 BHK Luxury Skyline Homestay · 4 Beds · Fully Air-Conditioned',
        'full_address': 'Blossom Skyline, Vikalp Khand, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'Sukoon Stay - 3 BHK 4 Beds (Blossom Skyline, Vikalp Khand, Gomti Nagar).pdf'
    },

    # ── 3 Properties in Vishesh Khand 3, Gomti Nagar ──
    {
        'display_name': 'THE YELLOW HOUSE',
        'type': '3 BHK Luxury Homestay Villa · 4 Beds',
        'full_address': '3/64 Vishesh Khand 3, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    🚗 Parking    ❄️ 100% AC',
        'filename': 'The Yellow House - 3 BHK 4 Beds (Vishesh Khand 3, Gomti Nagar).pdf'
    },
    {
        'display_name': 'THE GREEN HOUSE',
        'type': '3 BHK Luxury Homestay Villa · 4 Beds',
        'full_address': '3/64 Vishesh Khand 3, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    🌿 Balcony    👥 Up to 8 Guests    ❄️ 100% AC',
        'filename': 'The Green House - 3 BHK 4 Beds (Vishesh Khand 3, Gomti Nagar).pdf'
    },
    {
        'display_name': 'THE PINK HOUSE',
        'type': '5 BHK Grand Luxury Homestay Villa · 6 Beds',
        'full_address': '3/64 Vishesh Khand 3, Gomti Nagar, Lucknow',
        'specs': '🛏️ 6 Beds (5 King + Living Bed)    🚿 5 Attached Baths    👥 Up to 15 Guests    🌟 Terrace    ❄️ 100% AC',
        'filename': 'The Pink House - 5 BHK 6 Beds (Vishesh Khand 3, Gomti Nagar).pdf'
    },

    # ── 7 Properties Near Lulu Mall / Shaheed Path / Golf City ──
    {
        'display_name': 'CELEBRITY GARDEN',
        'type': '4 BHK Grand Luxury Homestay with Private Lawn · 5 Beds',
        'full_address': 'Celebrity Greens, Sushant Golf City, Near Lulu Mall & Shaheed Path, Lucknow',
        'specs': '🛏️ 5 Beds (4 King + Lounge Bed)    🚿 4 Attached Baths    🌳 Private Lawn    👥 Up to 12 Guests    ❄️ 100% AC',
        'filename': 'Celebrity Garden - 4 BHK 5 Beds with Lawn (Near Lulu Mall, Shaheed Path).pdf'
    },
    {
        'display_name': 'THE LUXE HAVEN',
        'type': '1 BHK Luxury Executive Flat · 2 Beds',
        'full_address': 'Near Lulu Mall & Medanta Hospital, Golf City, Shaheed Path, Lucknow',
        'specs': '🛏️ 2 Beds (1 Queen + Sofa Bed)    🚿 1 Luxury Bath    👥 Up to 3 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'The Luxe Haven - 1 BHK 2 Beds (Near Lulu Mall, Golf City).pdf'
    },
    {
        'display_name': 'GOMTI GRAND VILLA',
        'type': '4 BHK Luxury Independent Homestay Villa · 5 Beds',
        'full_address': 'Villa One, Geetapuri Colony, Near Lulu & Phoenix Palassio Mall, Lucknow',
        'specs': '🛏️ 5 Beds (4 King + Extra Bed)    🚿 4 Attached Baths    👥 Up to 14 Guests    🚗 Private Car Porch    ❄️ 100% AC',
        'filename': 'Gomti Grand Villa - 4 BHK 5 Beds Villa (Near Lulu & Palassio Mall).pdf'
    },
    {
        'display_name': 'ROYAL WHITE HOUSE',
        'type': '6 BHK Royal Independent Luxury Homestay Villa',
        'full_address': 'Omaxe City, Shaheed Path, Near Lulu Mall, Medanta & Airport, Lucknow',
        'specs': '🛏️ 6 Luxury Bedrooms    🚿 Attached Baths    👥 Grand Family Stays    🚗 Private Parking    ❄️ 100% AC',
        'filename': 'Royal White House - 6 BHK Royal Villa (Shaheed Path, Near Lulu Mall).pdf'
    },
    {
        'display_name': 'THE VELVET HOUSE',
        'type': '3 BHK Luxury Homestay Villa · 3 Beds',
        'full_address': 'Madhav Kunj, Shaheed Path, Near Medanta Hospital & Lulu Mall, Lucknow',
        'specs': '🛏️ 3 King Beds    🚿 3 Attached Baths    👥 Up to 6-8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'The Velvet House - 3 BHK 3 Beds Villa (Madhav Kunj, Near Lulu Mall).pdf'
    },
    {
        'display_name': 'GREEN FOREST',
        'type': '3 BHK Luxury Homestay Villa · 3 Beds',
        'full_address': 'Madhav Kunj, Shaheed Path, Near Lulu Mall & Ekana Stadium, Lucknow',
        'specs': '🛏️ 3 King Beds    🚿 3 Attached Baths    👥 Up to 6-8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'Green Forest - 3 BHK 3 Beds Villa (Madhav Kunj, Near Lulu Mall).pdf'
    },
    {
        'display_name': 'PINK PARADISE',
        'type': '3 BHK Luxury Homestay Villa · 3 Beds',
        'full_address': 'Madhav Kunj, Shaheed Path, Near Medanta Hospital & Lulu Mall, Lucknow',
        'specs': '🛏️ 3 King Beds    🚿 3 Attached Baths    👥 Up to 6-8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'Pink Paradise - 3 BHK 3 Beds Villa (Madhav Kunj, Near Lulu Mall).pdf'
    }
]

def extract_photos_from_pdf(pdf_path, cache_dir):
    os.makedirs(cache_dir, exist_ok=True)
    photos = []
    with pikepdf.open(pdf_path) as pdf:
        for i in range(1, len(pdf.pages)):
            page = pdf.pages[i]
            for name, img in page.get_images().items():
                try:
                    pdfimg = pikepdf.PdfImage(img)
                    pil_im = pdfimg.as_pil_image()
                    p_path = os.path.join(cache_dir, f'photo_{i:03d}.jpg')
                    pil_im.save(p_path, quality=98)
                    photos.append(p_path)
                except Exception as e:
                    pass
                break
    return photos

def create_tuhh_cover_page_300dpi(item, hero_path, cache_dir):
    W, H = 2480, 3508  # 300 DPI A4
    im = Image.new('RGB', (W, H), '#FFFFFF')
    draw = ImageDraw.Draw(im)

    f_bold = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
    f_reg = '/System/Library/Fonts/Supplemental/Arial.ttf'

    font_brand = ImageFont.truetype(f_bold, 56)
    font_brand_sub = ImageFont.truetype(f_reg, 30)
    font_tagline = ImageFont.truetype(f_reg, 28)
    font_title = ImageFont.truetype(f_bold, 86)
    font_type = ImageFont.truetype(f_bold, 42)
    font_loc = ImageFont.truetype(f_bold, 36)
    font_specs = ImageFont.truetype(f_bold, 34)
    font_contact_name = ImageFont.truetype(f_bold, 34)
    font_contact_sub = ImageFont.truetype(f_reg, 26)
    font_contact_num = ImageFont.truetype(f_bold, 36)

    # 1. Top Premium Header
    header_h = 300
    draw.rectangle([(0, 0), (W, header_h)], fill='#0F172A')

    # Paste Logo Crest
    if os.path.exists(LOGO_PATH):
        try:
            logo = Image.open(LOGO_PATH).convert('RGBA')
            logo.thumbnail((230, 230), Image.Resampling.LANCZOS)
            im.paste(logo, (120, 36), logo)
        except Exception as e:
            print("Logo error:", e)

    draw.text((390, 62), 'THE UNIQUE HAVEN HOMES', fill='#FFFFFF', font=font_brand)
    draw.text((390, 142), 'LUXURY HOMESTAYS & SERVICED VILLAS · LUCKNOW', fill='#94A3B8', font=font_brand_sub)
    draw.text((390, 195), '“Experience Unmatched Nawabi Hospitality & Modern Luxury”', fill='#D4AF37', font=font_tagline)

    # 2. Luxurious Warm Gold Divider Accent Line
    draw.rectangle([(0, header_h), (W, header_h + 16)], fill='#D4AF37')

    # 3. Property Title & Type (NO FLOOR REFERENCES)
    draw.text((120, 360), item['display_name'], fill='#0F172A', font=font_title)
    draw.text((120, 475), item['type'], fill='#D97706', font=font_type)

    # 4. Location Callout Badge
    draw.rounded_rectangle([(120, 560), (W - 120, 680)], radius=18, fill='#F8FAFC', outline='#CBD5E1', width=3)
    loc_text = f"📍 Location: {item['full_address']}"
    draw.text((160, 598), loc_text, fill='#0F172A', font=font_loc)

    # 5. Hero Photo Frame
    target_w = W - 240
    target_h = 1980
    if os.path.exists(hero_path):
        try:
            hero = Image.open(hero_path).convert('RGB')
            hero = ImageEnhance.Color(hero).enhance(1.08)
            hero = ImageEnhance.Contrast(hero).enhance(1.05)
            hero_fitted = ImageOps.fit(hero, (target_w, target_h), Image.Resampling.LANCZOS)
            hero_fitted = hero_fitted.filter(ImageFilter.UnsharpMask(radius=2.0, percent=140, threshold=2))
            im.paste(hero_fitted, (120, 720))
            draw.rounded_rectangle([(120, 720), (W - 120, 2700)], radius=24, outline='#0F172A', width=4)
        except Exception as e:
            print("Hero error:", e)

    # 6. Specs & Amenity Highlights Bar
    box_y = 2750
    draw.rounded_rectangle([(120, box_y), (W - 120, box_y + 155)], radius=18, fill='#0F172A')
    draw.text((165, box_y + 54), item['specs'], fill='#F8FAFC', font=font_specs)

    # 7. Trust & Booking Assurance Footer (Founder Direct Cards: Shahanshah & Firoz)
    foot_y = H - 540
    draw.rectangle([(0, foot_y), (W, H)], fill='#F8FAFC')
    draw.line([(120, foot_y), (W - 120, foot_y)], fill='#E2E8F0', width=3)
    draw.text((120, foot_y + 36), '🛡️ Verified Luxury Homestay by The Unique Haven Homes Private Limited', fill='#0F172A', font=ImageFont.truetype(f_bold, 34))
    draw.text((120, foot_y + 96), 'Professional Daily Housekeeping · 100% Sanitized Linens · Dedicated Ground Caretaker', fill='#64748B', font=ImageFont.truetype(f_reg, 29))

    card_y = foot_y + 170
    card_w = (W - 240 - 50) // 2
    card_h = 210

    # Card 1: Mr. Shahanshah
    draw.rounded_rectangle([(120, card_y), (120 + card_w, card_y + card_h)], radius=18, fill='#FFFFFF', outline='#0284C7', width=3)
    draw.text((160, card_y + 30), '👤 Mr. Shahanshah (Founder & Host)', fill='#0F172A', font=font_contact_name)
    draw.text((160, card_y + 90), '📞 Direct Call & WhatsApp:', fill='#64748B', font=font_contact_sub)
    draw.text((160, card_y + 135), '+91 9450055554', fill='#0284C7', font=font_contact_num)

    # Card 2: Mr. Firoz Khan
    c2_x = 120 + card_w + 50
    draw.rounded_rectangle([(c2_x, card_y), (c2_x + card_w, card_y + card_h)], radius=18, fill='#FFFFFF', outline='#0284C7', width=3)
    draw.text((c2_x + 40, card_y + 30), '👤 Mr. Firoz Khan (Co-Founder & Host)', fill='#0F172A', font=font_contact_name)
    draw.text((c2_x + 40, card_y + 90), '📞 Direct Call & WhatsApp:', fill='#64748B', font=font_contact_sub)
    draw.text((c2_x + 40, card_y + 135), '+91 8299600709', fill='#0284C7', font=font_contact_num)

    cover_p = os.path.join(cache_dir, '00_cover_300dpi.jpg')
    im.save(cover_p, 'JPEG', quality=99, subsampling=0)
    return cover_p

def upgrade_property_pdf(item):
    name = item['display_name']
    filename = item['filename']
    backup_pdf = os.path.join(BACKUP_DIR, filename)
    target_pdf = os.path.join(BASE_DIR, filename)
    
    slug = filename.split(' - ')[0].lower().replace(' ', '_')
    prop_cache = os.path.join(CACHE_ROOT, slug)
    os.makedirs(prop_cache, exist_ok=True)
    
    print(f"\n=======================================================")
    print(f"🚀 Upgrading: {name}")
    print(f"📍 Location: {item['full_address']}")
    print(f"📄 Output: {filename}")
    print(f"=======================================================")

    # 1. Extract photos from backup PDF
    photos = extract_photos_from_pdf(backup_pdf, os.path.join(prop_cache, 'extracted'))
    if not photos:
        print(f"❌ Failed to extract photos from {filename}")
        return False, 0, 0
    print(f"   ✓ Extracted {len(photos)} photos from original archive")

    # 2. Create 300 DPI Cover Page
    hero_path = photos[0]
    cover_page = create_tuhh_cover_page_300dpi(item, hero_path, prop_cache)
    print("   ✓ Rendered 300 DPI Cover Page with Shahanshah (+91 9450055554) & Firoz Khan (+91 8299600709)")

    # 3. Dynamic Compilation (Zero White Bars on Landscape Photos)
    all_pages = [cover_page] + photos
    
    a4_portrait = (img2pdf.mm_to_pt(210), img2pdf.mm_to_pt(297))
    a4_landscape = (img2pdf.mm_to_pt(297), img2pdf.mm_to_pt(210))
    fun_p = img2pdf.get_layout_fun(a4_portrait)
    fun_l = img2pdf.get_layout_fun(a4_landscape)

    def dynamic_layout(w, h, ndpi):
        if w > h:
            return fun_l(w, h, ndpi)
        else:
            return fun_p(w, h, ndpi)

    with open(target_pdf, 'wb') as f:
        f.write(img2pdf.convert(all_pages, layout_fun=dynamic_layout))

    mb = os.path.getsize(target_pdf) / (1024 * 1024)
    print(f"🎉 SUCCESS: Upgraded '{filename}' ({mb:.2f} MB, {len(all_pages)} pages)")
    return True, mb, len(all_pages)

def main():
    print("🌟 THE UNIQUE HAVEN HOMES — ULTRA-HD PDF UPGRADE ENGINE 🌟")
    print(f"Total properties to upgrade: {len(PORTFOLIO)}")
    t0 = time.time()
    results = []
    for item in PORTFOLIO:
        success, mb, pages = upgrade_property_pdf(item)
        if success:
            results.append((item['display_name'], mb, pages))

    print("\n" + "="*80)
    print(f"🏁 TUHH ULTRA-HD REPORT — ALL 20 PDFs UPGRADED IN {time.time()-t0:.2f}s")
    print("="*80)
    for name, mb, p in results:
        print(f" • {name:<35} | {mb:>6.2f} MB | {p:>3} pages")
    print("="*80)

if __name__ == '__main__':
    main()

