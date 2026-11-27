#!/usr/bin/env python3
"""
Mehman Heritage Stay & Hospitality - Dedicated Branded Property PDF Engine
Inspired by mehmanghar.in & User's Custom Royal Orange Brand Identity
Property: The Velvet Haven | Luxury 3BHK Near Gomtinagar
Hosts: Ahmed Shadab (+91 80901 40423), Ahmed Shahzad (+91 70073 00213)
"""

import os
import sys
import time
import glob
from PIL import Image, ImageDraw, ImageFont, ImageOps
import img2pdf

OUTPUT_DIR = '/Users/praveen/Developer/Partner Property PDFs/Mehman Heritage'
PHOTOS_DIR = '/Users/praveen/Downloads/Property'
LOGO_PATH = '/Users/praveen/Developer/airbnbmanager.github.io/assets/partners/mehman-heritage/mehman_heritage_orange_logo.jpg'

os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_mehman_cover_page():
    W, H = 1654, 2338  # Standard A4 at ~200 DPI
    im = Image.new('RGB', (W, H), '#FFFFFF')
    draw = ImageDraw.Draw(im)

    # Fonts
    f_georgia_b = '/System/Library/Fonts/Supplemental/Georgia Bold.ttf'
    f_georgia = '/System/Library/Fonts/Supplemental/Georgia.ttf'
    f_arial_b = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
    f_arial = '/System/Library/Fonts/Supplemental/Arial.ttf'

    font_brand = ImageFont.truetype(f_georgia_b, 40)
    font_brand_sub = ImageFont.truetype(f_arial_b, 21)
    font_tagline = ImageFont.truetype(f_georgia, 23)
    font_title = ImageFont.truetype(f_georgia_b, 58)
    font_type = ImageFont.truetype(f_arial_b, 29)
    font_loc = ImageFont.truetype(f_arial_b, 25)
    font_specs = ImageFont.truetype(f_arial_b, 23)
    font_contact_name = ImageFont.truetype(f_arial_b, 24)
    font_contact_num = ImageFont.truetype(f_arial_b, 24)

    # 1. Top Header Bar (Deep Obsidian Midnight with Warm Heritage Accent)
    draw.rectangle([(0, 0), (W, 200)], fill='#0F172A')

    # Paste Royal Orange Emblem Logo
    if os.path.exists(LOGO_PATH):
        try:
            logo = Image.open(LOGO_PATH).convert('RGB')
            logo_size = 156
            logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
            
            # Rounded corner mask for the square orange logo
            mask = Image.new('L', (logo_size, logo_size), 0)
            mask_draw = ImageDraw.Draw(mask)
            mask_draw.rounded_rectangle([(0, 0), (logo_size, logo_size)], radius=24, fill=255)
            
            # Gold luxury frame border
            draw.rounded_rectangle([(76, 20), (84 + logo_size, 28 + logo_size)], radius=26, fill='#F59E0B')
            im.paste(logo, (80, 24), mask)
        except Exception as e:
            print(f"Error pasting logo: {e}")

    # Header Brand Text
    draw.text((265, 42), 'MEHMAN HERITAGE', fill='#FFFFFF', font=font_brand)
    draw.text((265, 96), 'STAY & HOSPITALITY', fill='#F59E0B', font=font_brand_sub)
    draw.text((265, 132), '“Where guests become family”', fill='#FDBA74', font=font_tagline)

    # 2. Rich Metallic Saffron-Gold Divider Line
    draw.rectangle([(0, 200), (W, 210)], fill='#EA580C')

    # 3. Property Title & Type
    draw.text((80, 245), 'THE VELVET HAVEN', fill='#0F172A', font=font_title)
    draw.text((80, 320), '3 BHK Luxury Homestay · 4 Beds · Fully Air-Conditioned', fill='#C2410C', font=font_type)

    # 4. Location Callout Badge
    draw.rounded_rectangle([(80, 375), (W - 80, 455)], radius=12, fill='#FFF7ED', outline='#FDBA74', width=2)
    loc_text = "📍 Location: Near Gomti Nagar, Lucknow, Uttar Pradesh"
    draw.text((110, 399), loc_text, fill='#9A3412', font=font_loc)

    # 5. Hero Photo Frame
    hero_path = os.path.join(PHOTOS_DIR, 'WhatsApp Image 2026-11-28 at 12.52.27 AM.jpeg')
    if not os.path.exists(hero_path):
        hero_path = sorted(glob.glob(os.path.join(PHOTOS_DIR, '*.*')))[0]

    target_w = W - 160
    target_h = 1325
    if os.path.exists(hero_path):
        try:
            hero = Image.open(hero_path).convert('RGB')
            hero_fitted = ImageOps.fit(hero, (target_w, target_h), Image.Resampling.LANCZOS)
            im.paste(hero_fitted, (80, 480))
            draw.rounded_rectangle([(80, 480), (80 + target_w, 480 + target_h)], radius=16, outline='#0F172A', width=3)
        except Exception as e:
            print(f"Error inserting hero photo: {e}")

    # 6. Specs & Amenity Highlights Bar (Mehman Heritage Signature Bar)
    box_y = 1835
    draw.rounded_rectangle([(80, box_y), (W - 80, box_y + 105)], radius=12, fill='#0F172A')
    specs_text = "🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    📶 Wi-Fi    ❄️ 100% AC"
    draw.text((110, box_y + 36), specs_text, fill='#FFF7ED', font=font_specs)

    # 7. Luxury Partner Footer & Contact Cards
    foot_y = H - 360
    draw.rectangle([(0, foot_y), (W, H)], fill='#FDFBF7')
    draw.line([(80, foot_y), (W - 80, foot_y)], fill='#FED7AA', width=2)

    # Assurance line
    draw.text((80, foot_y + 24), '🛡️ Verified Luxury Homestay — Mehman Heritage Stay & Hospitality', fill='#0F172A', font=ImageFont.truetype(f_georgia_b, 24))
    draw.text((80, foot_y + 64), 'Dedicated Caretaker · Professional Daily Housekeeping · 100% Sanitized Linens · High-Speed Wi-Fi', fill='#78350F', font=ImageFont.truetype(f_arial, 20))

    # Host Direct Booking Contact Cards (Warm Orange & Terracotta Borders)
    card_y = foot_y + 115
    card_w = (W - 160 - 30) // 2

    # Card 1: Ahmed Shadab
    draw.rounded_rectangle([(80, card_y), (80 + card_w, card_y + 140)], radius=12, fill='#FFFFFF', outline='#EA580C', width=2)
    draw.text((110, card_y + 20), '👤 Ahmed Shadab', fill='#0F172A', font=font_contact_name)
    draw.text((110, card_y + 60), '📞 Direct Call & WhatsApp:', fill='#78350F', font=ImageFont.truetype(f_arial, 18))
    draw.text((110, card_y + 90), '+91 80901 40423', fill='#C2410C', font=font_contact_num)

    # Card 2: Ahmed Shahzad
    c2_x = 80 + card_w + 30
    draw.rounded_rectangle([(c2_x, card_y), (c2_x + card_w, card_y + 140)], radius=12, fill='#FFFFFF', outline='#EA580C', width=2)
    draw.text((c2_x + 30, card_y + 20), '👤 Ahmed Shahzad', fill='#0F172A', font=font_contact_name)
    draw.text((c2_x + 30, card_y + 60), '📞 Direct Call & WhatsApp:', fill='#78350F', font=ImageFont.truetype(f_arial, 18))
    draw.text((c2_x + 30, card_y + 90), '+91 70073 00213', fill='#C2410C', font=font_contact_num)

    cover_file = os.path.join(OUTPUT_DIR, '00_mehman_cover.jpg')
    im.save(cover_file, quality=95)
    print(f"✓ Cover Page generated: {cover_file}")
    return cover_file

def build_pdf():
    t0 = time.time()
    cover_page = create_mehman_cover_page()

    all_photos = sorted(glob.glob(os.path.join(PHOTOS_DIR, '*.*')))
    all_pages = [cover_page] + all_photos
    print(f"✓ Total pages: {len(all_pages)} (1 Cover + {len(all_photos)} Photos)")

    output_pdf = os.path.join(OUTPUT_DIR, 'The Velvet Haven - Luxury 3 BHK Near Gomti Nagar (Mehman Heritage).pdf')

    a4inpt = (img2pdf.mm_to_pt(210), img2pdf.mm_to_pt(297))
    layout_fun = img2pdf.get_layout_fun(a4inpt)

    with open(output_pdf, 'wb') as f:
        f.write(img2pdf.convert(all_pages, layout_fun=layout_fun))

    mb = os.path.getsize(output_pdf) / (1024 * 1024)
    print(f"🎉 SUCCESS: Re-compiled PDF at '{output_pdf}'")
    print(f"   Size: {mb:.2f} MB | Total Pages: {len(all_pages)} | Time: {time.time()-t0:.2f}s")
    return output_pdf, mb, len(all_pages)

if __name__ == '__main__':
    build_pdf()
