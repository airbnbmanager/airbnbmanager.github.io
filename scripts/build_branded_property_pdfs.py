#!/usr/bin/env python3
"""
Generate Luxury Branded Cover Pages and Compiles Descriptive Location-Named PDFs
WITHOUT any floor references, with EXACT user-verified BHK, Beds, and Location specs.
"""

import os
import re
import sys
import time
import glob
from PIL import Image, ImageDraw, ImageFont, ImageOps
import img2pdf

BASE_DIR = '/Users/praveen/Developer/Property PDFs'
LOGO_PATH = '/Users/praveen/Developer/airbnbmanager.github.io/assets/logo-crest.png'

# 20 Homestays with verified BHK, Beds, and Location (ZERO FLOOR REFERENCES)
PORTFOLIO = [
    # ── 10 Properties in Vikalp Khand, Chinhat, Gomti Nagar (3 BHK · 4 Beds) ──
    {
        'folder': 'Black Beauty',
        'display_name': 'BLACK BEAUTY',
        'type': '3 BHK Luxury Homestay · 4 Beds · Fully Air-Conditioned',
        'area_badge': 'Vikalp Khand, Chinhat, Gomti Nagar',
        'full_address': 'Vikalp Khand, Chinhat, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'Black Beauty - 3 BHK 4 Beds (Vikalp Khand, Chinhat, Gomti Nagar).pdf'
    },
    {
        'folder': 'RedRose Palace',
        'display_name': 'REDROSE PALACE',
        'type': '3 BHK Luxury Homestay · 4 Beds · Fully Air-Conditioned',
        'area_badge': 'Vikalp Khand, Chinhat, Gomti Nagar',
        'full_address': 'Vikalp Khand, Chinhat, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'RedRose Palace - 3 BHK 4 Beds (Vikalp Khand, Chinhat, Gomti Nagar).pdf'
    },
    {
        'folder': 'The Dark Blue',
        'display_name': 'THE DARK BLUE',
        'type': '3 BHK Luxury Homestay · 4 Beds · Fully Air-Conditioned',
        'area_badge': 'Vikalp Khand, Chinhat, Gomti Nagar',
        'full_address': 'Vikalp Khand, Chinhat, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'The Dark Blue - 3 BHK 4 Beds (Vikalp Khand, Chinhat, Gomti Nagar).pdf'
    },
    {
        'folder': 'The Brown',
        'display_name': 'THE BROWN',
        'type': '3 BHK Luxury Homestay · 4 Beds · Fully Air-Conditioned',
        'area_badge': 'Vikalp Khand, Chinhat, Gomti Nagar',
        'full_address': 'Vikalp Khand, Chinhat, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'The Brown - 3 BHK 4 Beds (Vikalp Khand, Chinhat, Gomti Nagar).pdf'
    },
    {
        'folder': 'The Light Green',
        'display_name': 'THE LIGHT GREEN',
        'type': '3 BHK Luxury Homestay · 4 Beds · Fully Air-Conditioned',
        'area_badge': 'Vikalp Khand, Chinhat, Gomti Nagar',
        'full_address': 'Vikalp Khand, Chinhat, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'The Light Green - 3 BHK 4 Beds (Vikalp Khand, Chinhat, Gomti Nagar).pdf'
    },
    {
        'folder': 'The Unique',
        'display_name': 'THE UNIQUE',
        'type': '3 BHK Luxury Homestay · 4 Beds · Fully Air-Conditioned',
        'area_badge': 'Vikalp Khand, Chinhat, Gomti Nagar',
        'full_address': 'Vikalp Khand, Chinhat, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'The Unique - 3 BHK 4 Beds (Vikalp Khand, Chinhat, Gomti Nagar).pdf'
    },
    {
        'folder': 'The Nawabi Stay',
        'display_name': 'THE NAWABI STAY',
        'type': '3 BHK Luxury Homestay · 4 Beds · Fully Air-Conditioned',
        'area_badge': 'Vikalp Khand, Chinhat, Gomti Nagar',
        'full_address': 'Vikalp Khand, Chinhat, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'The Nawabi Stay - 3 BHK 4 Beds (Vikalp Khand, Chinhat, Gomti Nagar).pdf'
    },
    {
        'folder': 'Starlight Blue PentHouse',
        'display_name': 'STARLIGHT BLUE PENTHOUSE',
        'type': 'Luxury PentHouse · 4 Beds · Private Open Terrace',
        'area_badge': 'Vikalp Khand, Chinhat, Gomti Nagar',
        'full_address': 'Vikalp Khand, Chinhat, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Lounge Bed)    🚿 3 Attached Baths    🌟 Private Terrace    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'Starlight Blue PentHouse - Luxury Penthouse 4 Beds (Vikalp Khand, Chinhat, Gomti Nagar).pdf'
    },
    {
        'folder': 'The Tehzeeb Nest',
        'display_name': 'THE TEHZEEB NEST',
        'type': '3 BHK Luxury Skyline Homestay · 4 Beds · Fully Air-Conditioned',
        'area_badge': 'Blossom Skyline, Vikalp Khand, Gomti Nagar',
        'full_address': 'Blossom Skyline, Vikalp Khand, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'The Tehzeeb Nest - 3 BHK 4 Beds (Blossom Skyline, Vikalp Khand, Gomti Nagar).pdf'
    },
    {
        'folder': 'Sukoon Stay',
        'display_name': 'SUKOON STAY',
        'type': '3 BHK Luxury Skyline Homestay · 4 Beds · Fully Air-Conditioned',
        'area_badge': 'Blossom Skyline, Vikalp Khand, Gomti Nagar',
        'full_address': 'Blossom Skyline, Vikalp Khand, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'Sukoon Stay - 3 BHK 4 Beds (Blossom Skyline, Vikalp Khand, Gomti Nagar).pdf'
    },

    # ── 3 Properties in Vishesh Khand 3, Gomti Nagar ──
    {
        'folder': 'The Yellow House',
        'display_name': 'THE YELLOW HOUSE',
        'type': '3 BHK Luxury Homestay Villa · 4 Beds',
        'area_badge': 'Vishesh Khand 3, Gomti Nagar',
        'full_address': '3/64 Vishesh Khand 3, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    👥 Up to 8 Guests    🚗 Parking    ❄️ 100% AC',
        'filename': 'The Yellow House - 3 BHK 4 Beds (Vishesh Khand 3, Gomti Nagar).pdf'
    },
    {
        'folder': 'The Green House',
        'display_name': 'THE GREEN HOUSE',
        'type': '3 BHK Luxury Homestay Villa · 4 Beds',
        'area_badge': 'Vishesh Khand 3, Gomti Nagar',
        'full_address': '3/64 Vishesh Khand 3, Gomti Nagar, Lucknow',
        'specs': '🛏️ 4 Beds (3 King + Living Bed)    🚿 3 Attached Baths    🌿 Balcony    👥 Up to 8 Guests    ❄️ 100% AC',
        'filename': 'The Green House - 3 BHK 4 Beds (Vishesh Khand 3, Gomti Nagar).pdf'
    },
    {
        'folder': 'The Pink House',
        'display_name': 'THE PINK HOUSE',
        'type': '5 BHK Grand Luxury Homestay Villa · 6 Beds',
        'area_badge': 'Vishesh Khand 3, Gomti Nagar',
        'full_address': '3/64 Vishesh Khand 3, Gomti Nagar, Lucknow',
        'specs': '🛏️ 6 Beds (5 King + Living Bed)    🚿 5 Attached Baths    👥 Up to 15 Guests    🌟 Terrace    ❄️ 100% AC',
        'filename': 'The Pink House - 5 BHK 6 Beds (Vishesh Khand 3, Gomti Nagar).pdf'
    },

    # ── 7 Properties Near Lulu Mall / Shaheed Path / Golf City ──
    # Celebrity Garden: 5 Beds with Lawn
    {
        'folder': 'Celebrity Garden',
        'display_name': 'CELEBRITY GARDEN',
        'type': '4 BHK Grand Luxury Homestay with Private Lawn · 5 Beds',
        'area_badge': 'Celebrity Greens, Sushant Golf City (Near Lulu Mall)',
        'full_address': 'Celebrity Greens, Sushant Golf City, Near Lulu Mall & Shaheed Path, Lucknow',
        'specs': '🛏️ 5 Beds (4 King + Lounge Bed)    🚿 4 Attached Baths    🌳 Private Lawn    👥 Up to 12 Guests    ❄️ 100% AC',
        'filename': 'Celebrity Garden - 4 BHK 5 Beds with Lawn (Near Lulu Mall, Shaheed Path).pdf'
    },
    {
        'folder': 'The Luxe Haven',
        'display_name': 'THE LUXE HAVEN',
        'type': '1 BHK Luxury Executive Flat · 2 Beds',
        'area_badge': 'Golf City, Near Lulu Mall & Medanta Hospital',
        'full_address': 'Near Lulu Mall & Medanta Hospital, Golf City, Shaheed Path, Lucknow',
        'specs': '🛏️ 2 Beds (1 Queen + Sofa Bed)    🚿 1 Luxury Bath    👥 Up to 3 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'The Luxe Haven - 1 BHK 2 Beds (Near Lulu Mall, Golf City).pdf'
    },
    # Gomti Grand Villa: 5 Beds
    {
        'folder': 'Gomti Grand Villa',
        'display_name': 'GOMTI GRAND VILLA',
        'type': '4 BHK Luxury Independent Homestay Villa · 5 Beds',
        'area_badge': 'Geetapuri, Near Lulu & Phoenix Palassio Mall',
        'full_address': 'Villa One, Geetapuri Colony, Near Lulu & Phoenix Palassio Mall, Lucknow',
        'specs': '🛏️ 5 Beds (4 King + Extra Bed)    🚿 4 Attached Baths    👥 Up to 14 Guests    🚗 Private Car Porch    ❄️ 100% AC',
        'filename': 'Gomti Grand Villa - 4 BHK 5 Beds Villa (Near Lulu & Palassio Mall).pdf'
    },
    # Royal White House: 6 BHK
    {
        'folder': 'Royal White House',
        'display_name': 'ROYAL WHITE HOUSE',
        'type': '6 BHK Royal Independent Luxury Homestay Villa',
        'area_badge': 'Omaxe City, Shaheed Path (Near Lulu Mall & Airport)',
        'full_address': 'Omaxe City, Shaheed Path, Near Lulu Mall, Medanta & Airport, Lucknow',
        'specs': '🛏️ 6 Luxury Bedrooms    🚿 Attached Baths    👥 Grand Family Stays    🚗 Private Parking    ❄️ 100% AC',
        'filename': 'Royal White House - 6 BHK Royal Villa (Shaheed Path, Near Lulu Mall).pdf'
    },
    # Madhav Kunj: 3 BHK · 3 Beds (The Velvet House, Green Forest, Pink Paradise)
    {
        'folder': 'The Velvet House',
        'display_name': 'THE VELVET HOUSE',
        'type': '3 BHK Luxury Homestay Villa · 3 Beds',
        'area_badge': 'Madhav Kunj (Near Lulu Mall & Medanta)',
        'full_address': 'Madhav Kunj, Shaheed Path, Near Medanta Hospital & Lulu Mall, Lucknow',
        'specs': '🛏️ 3 King Beds    🚿 3 Attached Baths    👥 Up to 6-8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'The Velvet House - 3 BHK 3 Beds Villa (Madhav Kunj, Near Lulu Mall).pdf'
    },
    {
        'folder': 'Green Forest',
        'display_name': 'GREEN FOREST',
        'type': '3 BHK Luxury Homestay Villa · 3 Beds',
        'area_badge': 'Madhav Kunj (Near Lulu Mall & Ekana)',
        'full_address': 'Madhav Kunj, Shaheed Path, Near Lulu Mall & Ekana Stadium, Lucknow',
        'specs': '🛏️ 3 King Beds    🚿 3 Attached Baths    👥 Up to 6-8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'Green Forest - 3 BHK 3 Beds Villa (Madhav Kunj, Near Lulu Mall).pdf'
    },
    {
        'folder': 'Pink Paradise',
        'display_name': 'PINK PARADISE',
        'type': '3 BHK Luxury Homestay Villa · 3 Beds',
        'area_badge': 'Madhav Kunj (Near Lulu Mall & Medanta)',
        'full_address': 'Madhav Kunj, Shaheed Path, Near Medanta Hospital & Lulu Mall, Lucknow',
        'specs': '🛏️ 3 King Beds    🚿 3 Attached Baths    👥 Up to 6-8 Guests    📶 Wi-Fi    ❄️ 100% AC',
        'filename': 'Pink Paradise - 3 BHK 3 Beds Villa (Madhav Kunj, Near Lulu Mall).pdf'
    }
]

def create_branded_cover_page(item, prop_folder):
    W, H = 1654, 2338  # A4 standard at ~200 DPI
    im = Image.new('RGB', (W, H), '#FFFFFF')
    draw = ImageDraw.Draw(im)

    # Fonts
    f_bold_path = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
    f_reg_path = '/System/Library/Fonts/Supplemental/Arial.ttf'

    f_brand = ImageFont.truetype(f_bold_path, 36)
    f_brand_sub = ImageFont.truetype(f_reg_path, 20)
    f_title = ImageFont.truetype(f_bold_path, 60)
    f_type = ImageFont.truetype(f_bold_path, 30)
    f_loc = ImageFont.truetype(f_bold_path, 26)
    f_body = ImageFont.truetype(f_bold_path, 23)
    f_sub = ImageFont.truetype(f_reg_path, 21)

    # 1. Top Premium Header (Deep Obsidian Navy)
    draw.rectangle([(0, 0), (W, 160)], fill='#0F172A')

    # Paste Logo
    if os.path.exists(LOGO_PATH):
        try:
            logo = Image.open(LOGO_PATH).convert('RGBA')
            logo.thumbnail((120, 120), Image.Resampling.LANCZOS)
            im.paste(logo, (80, 20), logo)
        except Exception:
            pass

    draw.text((220, 45), 'THE UNIQUE HAVEN HOMES', fill='#FFFFFF', font=f_brand)
    draw.text((220, 95), 'LUXURY HOMESTAYS & SERVICED VILLAS · LUCKNOW', fill='#94A3B8', font=f_brand_sub)

    # 2. Luxurious Warm Gold Divider Accent Line
    draw.rectangle([(0, 160), (W, 168)], fill='#D4AF37')

    # 3. Property Title & Type (NO FLOOR REFERENCES)
    draw.text((80, 215), item['display_name'], fill='#0F172A', font=f_title)
    draw.text((80, 295), item['type'], fill='#D97706', font=f_type)

    # 4. Location Callout Badge (NO FLOOR REFERENCES)
    draw.rounded_rectangle([(80, 355), (W - 80, 435)], radius=12, fill='#F8FAFC', outline='#CBD5E1', width=2)
    loc_text = f"📍 Location: {item['full_address']}"
    draw.text((105, 380), loc_text, fill='#0F172A', font=f_loc)

    # 5. Hero Photo Frame
    hero_path = os.path.join(prop_folder, '01.jpg')
    target_w = W - 160
    target_h = 1380
    if os.path.exists(hero_path):
        try:
            hero = Image.open(hero_path).convert('RGB')
            hero_fitted = ImageOps.fit(hero, (target_w, target_h), Image.Resampling.LANCZOS)
            im.paste(hero_fitted, (80, 465))
            draw.rounded_rectangle([(80, 465), (80 + target_w, 465 + target_h)], radius=16, outline='#0F172A', width=3)
        except Exception as e:
            print(f"Error pasting hero image for {item['display_name']}: {e}")

    # 6. Specs & Amenity Highlights Bar (BHK, Beds, Baths)
    box_y = 1880
    draw.rounded_rectangle([(80, box_y), (W - 80, box_y + 105)], radius=12, fill='#0F172A')
    draw.text((110, box_y + 36), item['specs'], fill='#F8FAFC', font=f_body)

    # 7. Trust & Booking Assurance Footer
    foot_y = H - 200
    draw.rectangle([(0, foot_y), (W, H)], fill='#F8FAFC')
    draw.line([(80, foot_y), (W - 80, foot_y)], fill='#E2E8F0', width=2)
    draw.text((80, foot_y + 35), '🛡️ Verified Homestay by The Unique Haven Homes Private Limited', fill='#0F172A', font=ImageFont.truetype(f_bold_path, 25))
    draw.text((80, foot_y + 75), 'Professional Housekeeping · 100% Sanitized Linens · Dedicated Ground Caretaker', fill='#64748B', font=f_sub)
    draw.text((80, foot_y + 115), 'Direct Bookings: +91 91700 00000  |  Website: uniquehavenhomesstay.com', fill='#0284C7', font=ImageFont.truetype(f_bold_path, 24))

    cover_file = os.path.join(prop_folder, '00_cover.jpg')
    im.save(cover_file, quality=95)
    return cover_file

def build_property_pdf(item):
    name = item['display_name']
    prop_folder = os.path.join(BASE_DIR, item['folder'])
    new_pdf_name = item['filename']
    new_pdf_path = os.path.join(BASE_DIR, new_pdf_name)
    
    print(f"\n==================================================")
    print(f"🎨 Generating Branded PDF: {name}")
    print(f"📍 Location: {item['area_badge']}")
    print(f"📄 Output File: {new_pdf_name}")
    print(f"==================================================")
    
    # 1. Generate branded cover page (Page 1)
    t0 = time.time()
    cover_path = create_branded_cover_page(item, prop_folder)
    print(f"   ✓ Cover Page generated: {os.path.basename(cover_path)}")
    
    # 2. Collect all images in sequence: Cover (Page 1) + 01.jpg, 02.jpg ...
    all_imgs = [cover_path]
    for i in range(1, 150):
        fname = f"{i:02d}.jpg"
        fpath = os.path.join(prop_folder, fname)
        if os.path.exists(fpath) and os.path.getsize(fpath) > 1000:
            all_imgs.append(fpath)
            
    print(f"   ✓ Collected {len(all_imgs)} pages ({len(all_imgs)-1} property photos + 1 Branded Cover)")
    
    # 3. Compile PDF using img2pdf
    a4inpt = (img2pdf.mm_to_pt(210), img2pdf.mm_to_pt(297))
    layout_fun = img2pdf.get_layout_fun(a4inpt)
    
    try:
        pdf_bytes = img2pdf.convert(all_imgs, layout_fun=layout_fun)
        with open(new_pdf_path, 'wb') as f:
            f.write(pdf_bytes)
            
        mb = os.path.getsize(new_pdf_path) / (1024 * 1024)
        print(f"   🎉 Built {new_pdf_name} ({mb:.2f} MB, {len(all_imgs)} pages) in {time.time()-t0:.2f}s")
        return True, new_pdf_name, mb, len(all_imgs)
    except Exception as e:
        print(f"   ❌ Error building PDF for {name}: {e}")
        return False, new_pdf_name, 0, 0

def cleanup_outdated_pdfs():
    # Remove files that are being renamed
    to_clean = [
        'Celebrity Garden - 4 BHK 4 Beds with Lawn (Near Lulu Mall, Shaheed Path).pdf',
        'Gomti Grand Villa - 4 BHK 4 Beds Villa (Near Lulu & Palassio Mall).pdf',
        'Royal White House - Royal Villa 5 Beds (Shaheed Path, Near Lulu Mall).pdf',
        'The Velvet House - 3 BHK 4 Beds Villa (Shaheed Path, Near Lulu Mall).pdf',
        'Green Forest - 3 BHK 4 Beds Villa (Shaheed Path, Near Lulu Mall).pdf',
        'Pink Paradise - 3 BHK 4 Beds Villa (Shaheed Path, Near Lulu Mall).pdf'
    ]
    for f in to_clean:
        p = os.path.join(BASE_DIR, f)
        if os.path.exists(p):
            try:
                os.remove(p)
                print(f"Cleaned outdated PDF: {f}")
            except Exception:
                pass

def main():
    print("🚀 Initializing Updated Branded PDF Generator (Gomti Grand Villa 5 Beds, Garden 5 Beds, Madhav Kunj 3 Beds, White House 6 BHK)")
    cleanup_outdated_pdfs()
    
    results = []
    for item in PORTFOLIO:
        success, fname, mb, pages = build_property_pdf(item)
        if success:
            results.append((fname, mb, pages))
            
    print("\n" + "="*85)
    print("🏁 FINAL REPORT: ALL 20 UPDATED PDFs COMPILED WITH EXACT SPECS")
    print("="*85)
    for fname, mb, pages in results:
        print(f" • {fname:<72} | {mb:>6.2f} MB | {pages:>3} pages")
    print("="*85)

if __name__ == '__main__':
    main()
