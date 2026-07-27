import hashlib
import pypdf
import json

pdf_path = '/Users/fredyreyes/.gemini/antigravity/brain/e2dbc227-906f-45db-8c5c-132ca8ff1603/media__1785194158049.pdf'
reader = pypdf.PdfReader(pdf_path)

# Known hashes from J1 (Page 2)
hash_to_team = {
    '150d5168ad1b057b755e385e4e7f5d4d': 'Necaxa',
    '0161c94a234470a225fec0a92ba4be3f': 'Atlante',
    'c9105ef8dc24dd03fd96fbadbee2d017': 'Tijuana',
    '4e12742a3ede09e1053c8c89d3a2557a': 'Tigres UANL',
    '08cdf91935d1c027c327c5660c1634a3': 'Atlético de San Luis',
    'c3e02920c98bb586db7a8995eb39c014': 'Cruz Azul',
    '742ba403ff3a406d54e8193aeab6546b': 'León',
    '7a5a5c74d955916973b2ca083edba084': 'Atlas',
    '5c66d8a95eb024407605cdc06522129f': 'Juárez',
    '8e605dcc887013cb2b4ff2a46a5fc4ff': 'Puebla',
    'c655be5131ae902b7b9694a4c2b37334': 'Pumas UNAM',
    '4698905efa58bfed9480ebd6eb4a9075': 'Pachuca',
    '4412132567b12b363808ba1b11ef3055': 'Guadalajara',
    '6a78094fd82cb0842311b5afe17fe3ec': 'Toluca',
    '6f8d8a51c8f974104b1346f1a1367c20': 'Monterrey',
    'd62c38fcd65e6ea44fb2e3bc154f6156': 'Santos Laguna',
    'd50286708ad3c70d401b44b4a33d9ef8': 'Querétaro',
    'de22659298285fdba74107cea4edfdbc': 'América',
    'ff57dad94a5730e5d87cb87d6c04275f': 'Mazatlán'
}

# Standard home stadium mapping for single-tenant stadiums
stadium_to_home = {
    'VICTORIA': 'Necaxa',
    'CALIENTE': 'Tijuana',
    'LIBERTAD FINANCIERA': 'Atlético de San Luis',
    'NOU CAMP': 'León',
    'OLÍMPICO BENITO JUÁREZ': 'Juárez',
    'OLÍMPICO UNIVERSITARIO': 'Pumas UNAM',
    'AKRON': 'Guadalajara',
    'BBVA': 'Monterrey',
    'LA CORREGIDORA': 'Querétaro',
    'NEMESIO DIEZ': 'Toluca',
    'UNIVERSITARIO': 'Tigres UANL',
    'TSM CORONA': 'Santos Laguna',
    'HIDALGO': 'Pachuca',
    'CUAUHTÉMOC': 'Puebla',
    'JALISCO': 'Atlas'
}

# We will run multiple passes to resolve all hashes
all_jornadas = {}

for pass_idx in range(5):
    for page_idx in range(1, 8):
        page = reader.pages[page_idx]
        xobj = page['/Resources']['/XObject'].get_object() if '/Resources' in page and '/XObject' in page['/Resources'] else {}
        
        img_hashes = {}
        for name in xobj:
            obj = xobj[name]
            if obj['/Subtype'] == '/Image':
                img_data = obj.get_data()
                md5 = hashlib.md5(img_data).hexdigest()
                img_hashes[name] = md5
                
        content = page.get_contents()
        if content is None:
            continue
        data = b''.join(c.get_data() for c in content) if isinstance(content, list) else content.get_data()
        tokens = data.decode('latin1', errors='ignore').split()
        
        current_matrix = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0]
        gs_stack = []
        stack = []
        
        images = []
        for t in tokens:
            try:
                val = float(t)
                stack.append(val)
            except ValueError:
                if t == 'cm':
                    current_matrix = stack[-6:]
                    stack = []
                elif t == 'q':
                    gs_stack.append(list(current_matrix))
                elif t == 'Q':
                    if gs_stack:
                        current_matrix = gs_stack.pop()
                elif t == 'Do':
                    if stack:
                        img_ref = stack[-1]
                        if img_ref in img_hashes:
                            h = img_hashes[img_ref]
                            images.append({'y': current_matrix[5], 'x': current_matrix[4], 'hash': h})
                    stack = []
                elif t.startswith('/'):
                    stack.append(t)
                else:
                    stack = [x for x in stack if isinstance(x, str) and x.startswith('/')]
                    
        # Extract text runs
        text_runs = []
        def visitor(text, cm, tm, font_dict, font_size):
            if text.strip():
                text_runs.append({'y': tm[5], 'x': tm[4], 'text': text.strip()})
        page.extract_text(visitor_text=visitor)
        
        # Sort runs top-to-bottom
        text_runs.sort(key=lambda r: -r['y'])
        
        # Group runs into rows
        rows = []
        current_y = None
        current_row = []
        for r in text_runs:
            if current_y is None or abs(current_y - r['y']) > 8:
                if current_row:
                    current_row.sort(key=lambda x: x['x'])
                    rows.append(current_row)
                current_row = []
                current_y = r['y']
            current_row.append(r)
        if current_row:
            current_row.sort(key=lambda x: x['x'])
            rows.append(current_row)
            
        # Parse matches in this page
        # Figure out which Jornadas are on this page
        # Page 2: J1 (left), J2 (right)
        # Page 3: J3 (left top), J4 (left bottom), J5 (right)
        # Page 4: J6 (top), J7 (bottom)
        # Page 5: J8 (top), J9 (bottom)
        # Page 6: J10 (left top? No, J10 is top, J11 is bottom left, J12 is bottom right)
        # Page 7: J13 (left top), J14 (right top), J15 (left bottom), J16 (right bottom)
        # Page 8: J17 (right)
        
        for row in rows:
            row_y = row[0]['y']
            
            # Find left column match
            left_row = [r for r in row if r['x'] < 300]
            left_stadium = None
            for r in left_row:
                if r['text'] in stadium_to_home or r['text'] == 'BANORTE':
                    left_stadium = r['text']
                    break
            
            # Find right column match
            right_row = [r for r in row if r['x'] >= 300]
            right_stadium = None
            for r in right_row:
                if r['text'] in stadium_to_home or r['text'] == 'BANORTE':
                    right_stadium = r['text']
                    break
            
            for stadium, is_left, row_texts in [(left_stadium, True, left_row), (right_stadium, False, right_row)]:
                if stadium:
                    # Find matching images on same page and column
                    row_images = []
                    for img in images:
                        if abs(img['y'] - row_y) < 15:
                            img_is_left = img['x'] < 300
                            if img_is_left == is_left:
                                row_images.append(img)
                                
                    row_images.sort(key=lambda img: img['x'])
                    
                    if len(row_images) >= 2:
                        local_hash = row_images[0]['hash']
                        visitor_hash = row_images[1]['hash']
                        
                        # 1. Resolve local team
                        local_team = hash_to_team.get(local_hash)
                        if not local_team and stadium != 'BANORTE':
                            local_team = stadium_to_home[stadium]
                            hash_to_team[local_hash] = local_team
                            
                        # 2. Resolve visitor team
                        visitor_team = hash_to_team.get(visitor_hash)
                        
                        # If we know the team from other means, set it
                        if local_team:
                            hash_to_team[local_hash] = local_team
                        if visitor_team:
                            hash_to_team[visitor_hash] = visitor_team

# Now we run one final pass to collect and print everything nicely formatted!
jornada_matches = {}

for page_idx in range(1, 8):
    page = reader.pages[page_idx]
    xobj = page['/Resources']['/XObject'].get_object() if '/Resources' in page and '/XObject' in page['/Resources'] else {}
    
    img_hashes = {}
    for name in xobj:
        obj = xobj[name]
        if obj['/Subtype'] == '/Image':
            img_hashes[name] = hashlib.md5(obj.get_data()).hexdigest()
            
    content = page.get_contents()
    if content is None:
        continue
    data = b''.join(c.get_data() for c in content) if isinstance(content, list) else content.get_data()
    tokens = data.decode('latin1', errors='ignore').split()
    
    current_matrix = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0]
    gs_stack = []
    stack = []
    images = []
    
    for t in tokens:
        try:
            val = float(t)
            stack.append(val)
        except ValueError:
            if t == 'cm':
                current_matrix = stack[-6:]
                stack = []
            elif t == 'q':
                gs_stack.append(list(current_matrix))
            elif t == 'Q':
                if gs_stack:
                    current_matrix = gs_stack.pop()
            elif t == 'Do':
                if stack:
                    img_ref = stack[-1]
                    if img_ref in img_hashes:
                        images.append({'y': current_matrix[5], 'x': current_matrix[4], 'hash': img_hashes[img_ref]})
                stack = []
            elif t.startswith('/'):
                stack.append(t)
            else:
                stack = [x for x in stack if isinstance(x, str) and x.startswith('/')]
                
    text_runs = []
    def visitor(text, cm, tm, font_dict, font_size):
        if text.strip():
            text_runs.append({'y': tm[5], 'x': tm[4], 'text': text.strip()})
    page.extract_text(visitor_text=visitor)
    
    text_runs.sort(key=lambda r: -r['y'])
    
    rows = []
    current_y = None
    current_row = []
    for r in text_runs:
        if current_y is None or abs(current_y - r['y']) > 8:
            if current_row:
                current_row.sort(key=lambda x: x['x'])
                rows.append(current_row)
            current_row = []
            current_y = r['y']
        current_row.append(r)
    if current_row:
        current_row.sort(key=lambda x: x['x'])
        rows.append(current_row)
        
    # We trace which Jornada is which based on coordinates
    for row in rows:
        row_y = row[0]['y']
        
        # Find left column match
        left_row = [r for r in row if r['x'] < 300]
        left_stadium = None
        for r in left_row:
            if r['text'] in stadium_to_home or r['text'] == 'BANORTE':
                left_stadium = r['text']
                break
        
        # Find right column match
        right_row = [r for r in row if r['x'] >= 300]
        right_stadium = None
        for r in right_row:
            if r['text'] in stadium_to_home or r['text'] == 'BANORTE':
                right_stadium = r['text']
                break
        
        for stadium, is_left, row_texts in [(left_stadium, True, left_row), (right_stadium, False, right_row)]:
            if stadium:
                # Find matching images
                row_images = []
                for img in images:
                    if abs(img['y'] - row_y) < 15:
                        if (img['x'] < 300) == is_left:
                            row_images.append(img)
                row_images.sort(key=lambda img: img['x'])
                
                # Extract day and hour
                row_texts_sorted = list(row_texts)
                row_texts_sorted.sort(key=lambda r: r['x'])
                
                day = row_texts_sorted[0]['text'] if len(row_texts_sorted) > 0 else 'TBD'
                hour = row_texts_sorted[1]['text'] if len(row_texts_sorted) > 1 else '00:00'
                
                # Figure out Jornada number
                jornada_num = 1
                if page_idx == 1: # Page 2
                    jornada_num = 1 if is_left else 2
                elif page_idx == 2: # Page 3
                    if is_left:
                        jornada_num = 3 if row_y > 350 else 4
                    else:
                        jornada_num = 5
                elif page_idx == 3: # Page 4
                    jornada_num = 6 if row_y > 350 else 7
                elif page_idx == 4: # Page 5
                    jornada_num = 8 if row_y > 350 else 9
                elif page_idx == 5: # Page 6
                    if row_y > 400:
                        jornada_num = 10
                    else:
                        jornada_num = 11 if is_left else 12
                elif page_idx == 6: # Page 7
                    if row_y > 350:
                        jornada_num = 13 if is_left else 14
                    else:
                        jornada_num = 15 if is_left else 16
                elif page_idx == 7: # Page 8
                    jornada_num = 17
                    
                if len(row_images) >= 2:
                    local_team = hash_to_team.get(row_images[0]['hash'], 'UNKNOWN')
                    visitor_team = hash_to_team.get(row_images[1]['hash'], 'UNKNOWN')
                    
                    # Check for special Banorte local team cases
                    if local_team == 'UNKNOWN' or local_team == 'Atlante':
                        # Look up by stadium
                        if stadium != 'BANORTE':
                            local_team = stadium_to_home[stadium]
                    
                    if jornada_num not in jornada_matches:
                        jornada_matches[jornada_num] = []
                    jornada_matches[jornada_num].append({
                        'local_team': local_team,
                        'visitor_team': visitor_team,
                        'stadium': stadium,
                        'day': day,
                        'hour': hour,
                        'row_y': row_y
                    })

# Print matches in order
for j in sorted(jornada_matches.keys()):
    print(f'\n--- JORNADA {j} ---')
    for m in sorted(jornada_matches[j], key=lambda x: -x['row_y']):
        print(f"  {m['day']} {m['hour']} | {m['local_team']} vs {m['visitor_team']} ({m['stadium']})")
