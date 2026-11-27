#!/usr/bin/env python3
"""
Mehman Heritage Stay & Hospitality - Dedicated Branded PDF Engine (300 DPI)
Property: 2 BHK Home Near Charbagh Railway Station (Airbnb: 1530589471945966741)
Hosts: Ahmed Shadab (+91 80901 40423), Ahmed Shahzad (+91 70073 00213)
"""

import os
import sys
import time
import glob
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageEnhance, ImageFilter
import img2pdf

BASE_PARTNER_DIR = '/Users/praveen/Developer/Partner Property PDFs/Mehman Heritage'
OUTPUT_DIR = BASE_PARTNER_DIR
CACHE_DIR = os.path.join(BASE_PARTNER_DIR, 'charbagh_enhanced_cache')
PHOTOS_DIR = os.path.join(BASE_PARTNER_DIR, 'Charbagh_2BHK_Photos')
LOGO_PATH = '/Users/praveen/Developer/airbnbmanager.github.io/assets/partners/mehman-heritage/mehman_heritage_orange_logo.jpg'

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

def enhance_photo(in_path, out_path):
    try:
        im = Image.open(in_path).convert('RGB')
        w, h = im.size
        
        long_edge = max(w, h)
        if long_edge < 2200:
            scale = min(2.5, 2400.0 / long_edge)
            new_w = int(w * scale)
            new_h = int(h * scale)
            im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
            
        im = ImageEnhance.Color(im).enhance(1.08)
        im = ImageEnhance.Contrast(im).enhance(1.05)
        im = im.filter(ImageFilter.UnsharpMask(radius=1.8, percent=130, threshold=2))
        
        im.save(out_path, 'JPEG', quality=92, subsampling=0)
        return True
    except Exception as e:
        print(f"Error enhancing {in_path}: {e}")
        return False

def create_charbagh_cover_page():
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
    font_title = ImageFont.truetype(f_georgia_b, 80)
    font_type = ImageFont.truetype(f_arial_b, 44)
    font_loc = ImageFont.truetype(f_arial_b, 38)
    font_specs = ImageFont.truetype(f_arial_b, 35)
    font_contact_name = ImageFont.truetype(f_arial_b, 36)
    font_contact_sub = ImageFont.truetype(f_arial, 27)
    font_contact_num = ImageFont.truetype(f_arial_b, 36)

    # 1. Header Bar
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
        except Exception as e:
            print(f"Error pasting logo: {e}")

    draw.text((390, 62), 'MEHMAN HERITAGE', fill='#FFFFFF', font=font_brand)
    draw.text((390, 145), 'STAY & HOSPITALITY', fill='#F59E0B', font=font_brand_sub)
    draw.text((390, 200), '“Where guests become family”', fill='#FDBA74', font=font_tagline)

    # 2. Saffron-Gold Divider
    draw.rectangle([(0, header_h), (W, header_h + 16)], fill='#EA580C')

    # 3. Property Title & Type
    draw.text((120, 360), '2 BHK LUXE NEAR CHARBAGH', fill='#0F172A', font=font_title)
    draw.text((120, 475), '2 BHK Premium Homestay · 3 Beds · Fully Air-Conditioned', fill='#C2410C', font=font_type)

    # 4. Location Badge
    draw.rounded_rectangle([(120, 560), (W - 120, 680)], radius=18, fill='#FFF7ED', outline='#FDBA74', width=3)
    loc_text = "📍 Location: Near Charbagh Railway Station, Lucknow, Uttar Pradesh"
    draw.text((160, 598), loc_text, fill='#9A3412', font=font_loc)

    # 5. Hero Photo
    hero_raw = os.path.join(PHOTOS_DIR, 'photo_01.jpg')
    target_w = W - 240
    target_h = 1980
    if os.path.exists(hero_raw):
        try:
            hero = Image.open(hero_raw).convert('RGB')
            hero = ImageEnhance.Color(hero).enhance(1.10)
            hero = ImageEnhance.Contrast(hero).enhance(1.06)
            hero_fitted = ImageOps.fit(hero, (target_w, target_h), Image.Resampling.LANCZOS)
            hero_fitted = hero_fitted.filter(ImageFilter.UnsharpMask(radius=2.0, percent=140, threshold=2))
            im.paste(hero_fitted, (120, 720))
            draw.rounded_rectangle([(120, 720), (120 + target_w, 720 + target_h)], radius=24, outline='#0F172A', width=4)
        except Exception as e:
            print(f"Error inserting hero photo: {e}")

    # 6. Specs Bar
    box_y = 2750
    box_h = 155
    draw.rounded_rectangle([(120, box_y), (W - 120, box_y + box_h)], radius=18, fill='#0F172A')
    specs_text = "🛏️ 3 Beds (King & Double)    🚿 2 Attached Baths    👥 Up to 6 Guests    📶 Wi-Fi    ❄️ 100% AC"
    draw.text((165, box_y + 54), specs_text, fill='#FFF7ED', font=font_specs)

    # 7. Partner Footer
    foot_y = H - 540
    draw.rectangle([(0, foot_y), (W, H)], fill='#FDFBF7')
    draw.line([(120, foot_y), (W - 120, foot_y)], fill='#FED7AA', width=3)

    draw.text((120, foot_y + 36), '🛡️ Verified Luxury Homestay — Mehman Heritage Stay & Hospitality', fill='#0F172A', font=ImageFont.truetype(f_georgia_b, 35))
    draw.text((120, foot_y + 96), 'Dedicated Caretaker · Professional Daily Housekeeping · 100% Sanitized Linens · High-Speed Wi-Fi', fill='#78350F', font=ImageFont.truetype(f_arial, 29))

    # Host Contact Cards
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

    cover_file = os.path.join(CACHE_DIR, '00_charbagh_cover.jpg')
    im.save(cover_file, 'JPEG', quality=99, subsampling=0)
    print(f"✓ Cover Page generated: {cover_file}")
    return cover_file

def build_pdf():
    t0 = time.time()
    cover_page = create_charbagh_cover_page()

    raw_photos = sorted(glob.glob(os.path.join(PHOTOS_DIR, '*.*')))
    enhanced_pages = [cover_page]
    
    for i, p in enumerate(raw_photos):
        out_name = f"enhanced_{i+1:02d}.jpg"
        out_p = os.path.join(CACHE_DIR, out_name)
        enhance_photo(p, out_p)
        enhanced_pages.append(out_p)

    output_pdf = os.path.join(OUTPUT_DIR, '2 BHK Luxe Near Charbagh - Mehman Heritage.pdf')

    a4_portrait = (img2pdf.mm_to_pt(210), img2pdf.mm_to_pt(297))
    a4_landscape = (img2pdf.mm_to_pt(297), img2pdf.mm_to_pt(210))

    fun_p = img2pdf.get_layout_fun(a4_portrait)
    fun_l = img2pdf.get_layout_fun(a4_landscape)

    def dynamic_layout(imgwidthpx, imgheightpx, ndpi):
        if imgwidthpx > imgheightpx:
            return fun_l(imgwidthpx, imgheightpx, ndpi)
        else:
            return fun_p(imgwidthpx, imgheightpx, ndpi)

    with open(output_pdf, 'wb') as f:
        f.write(img2pdf.convert(enhanced_pages, layout_fun=dynamic_layout))

    mb = os.path.getsize(output_pdf) / (1024 * 1024)
    print(f"\n🎉 SUCCESS: Generated Charbagh PDF at '{output_pdf}'")
    print(f"   Size: {mb:.2f} MB | Total Pages: {len(enhanced_pages)} | Time: {time.time()-t0:.2f}s")
    return output_pdf, mb, len(enhanced_pages)

if __name__ == '__main__':
    build_pdf()
