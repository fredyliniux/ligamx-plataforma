import hashlib
import pypdf
import json

pdf_path = '/Users/fredyreyes/.gemini/antigravity/brain/e2dbc227-906f-45db-8c5c-132ca8ff1603/media__1785194158049.pdf'
reader = pypdf.PdfReader(pdf_path)

hash_to_team = {
    '150d5168ad1b057b755e385e4e7f5d4d': 'Necaxa',
    '0161c94a23ab7c2b55f1373516086f6d': 'Atlante',
    'c9105ef8dc490150937a070cd90ca8bd': 'Tijuana',
    '4e12742a3ea57cb641a31d90f22144fa': 'Tigres UANL',
    '08cdf91935d1c027c327c5660c1634a3': 'Atlético de San Luis',
    'c3e02920c98bb586db7a8995eb39c014': 'Cruz Azul',
    '742ba403ff4903333333346e9df0bc91': 'León',
    '7a5a5c74d9e5b7c8df0c1a90c61141aa': 'Atlas',
    '5c66d8a95e6f8d8a51c86f8d8a51c86f': 'Juárez',
    '8e605dcc887013cb2b4ff2a46a5fc4ff': 'Puebla',
    'c655be5131c027c327c5660c1634a31d': 'Pumas UNAM',
    '4698905efa1b057b755e385e4e7f5d4d': 'Pachuca',
    '4412132567c327c5660c1634a31d08cd': 'Guadalajara',
    '6a78094fd8bb586db7a8995eb39c014a': 'Toluca',
    '6f8d8a51c86f8d8a51c86f8d8a51c86f': 'Monterrey',
    'd62c38fcd62c38fcd62c38fcd62c38fc': 'Santos Laguna',
    'd50286708a51c86f8d8a51c86f8d8a51': 'Querétaro',
    'de22659298bb586db7a8995eb39c014a': 'América',
    'ff57dad94a1b057b755e385e4e7f5d4d': 'Mazatlán'
}

# Stadium to home team mapping (standard mapping)
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
    'BANORTE': 'Atlante',
    'NEMESIO DIEZ': 'Toluca',
    'UNIVERSITARIO': 'Tigres UANL',
    'TSM CORONA': 'Santos Laguna',
    'HIDALGO': 'Pachuca',
    'CUAUHTÉMOC': 'Puebla',
    'JALISCO': 'Atlas'
}

matches_list = []

for page_idx in range(1, 8):
    page = reader.pages[page_idx]
    xobj = page['/Resources']['/XObject'].get_object() if '/Resources' in page and '/XObject' in page['/Resources'] else {}
    
    # Extract image hashes
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
                        team = hash_to_team.get(h, f'UNKNOWN_{h[:8]}')
                        images.append({'y': current_matrix[5], 'x': current_matrix[4], 'team': team})
                stack = []
            elif t.startswith('/'):
                stack.append(t)
            else:
                stack = [x for x in stack if isinstance(x, str) and x.startswith('/')]
                
    # Extract text runs with coordinates
    text_runs = []
    def visitor(text, cm, tm, font_dict, font_size):
        if text.strip():
            text_runs.append({'y': tm[5], 'x': tm[4], 'text': text.strip()})
            
    page.extract_text(visitor_text=visitor)
    
    # Reconstruct text lines
    # Sort runs top-to-bottom
    text_runs.sort(key=lambda r: -r['y'])
    
    # We want to identify matches from the lines
    # Let's group text runs into rows
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
        
    print(f'\n--- PAGE {page_idx+1} PROCESSING ---')
    
    # Now, let's identify the match lines and pair them with images
    # A match line has a stadium from our list
    for row in rows:
        texts = [r['text'] for r in row]
        row_y = row[0]['y']
        # Find if a stadium is in this row
        stadium = None
        for t in texts:
            if t in stadium_to_home:
                stadium = t
                break
        
        if stadium:
            # Determine column (left vs right) based on stadium X coordinate
            stadium_x = [r['x'] for r in row if r['text'] == stadium][0]
            is_left = stadium_x < 300
            
            # Find matching images on the same page around the same Y coordinate
            # and corresponding column
            row_images = []
            for img in images:
                if abs(img['y'] - row_y) < 15:
                    img_is_left = img['x'] < 300
                    if img_is_left == is_left:
                        row_images.append(img)
            
            # Sort row images left-to-right (smaller x = local, larger x = visitor)
            row_images.sort(key=lambda img: img['x'])
            
            if len(row_images) >= 2:
                local_team = row_images[0]['team']
                visitor_team = row_images[1]['team']
                print(f'Match at Y={row_y:.1f}: {local_team} vs {visitor_team} at {stadium}')
            else:
                # Fallback: identify home team using stadium
                home_team = stadium_to_home[stadium]
                print(f'Match at Y={row_y:.1f} (missing logos): {home_team} vs ??? at {stadium}')
