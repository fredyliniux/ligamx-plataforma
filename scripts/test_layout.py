import hashlib
import pypdf
import re

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

for page_idx in range(1, 8): # Pages 2 to 8 (J1 to J17)
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
    if not content:
        continue
    data = b''.join(c.get_data() for c in content) if isinstance(content, list) else content.get_data()
    tokens = data.decode('latin1', errors='ignore').split()
    
    # We trace coordinates of Do calls and texts
    current_matrix = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0]
    gs_stack = []
    stack = []
    
    elements = [] # list of (y, x, type, val)
    
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
                        elements.append((current_matrix[5], current_matrix[4], 'image', team))
                stack = []
            elif t.startswith('/'):
                stack.append(t)
            else:
                # Keep only string tokens
                stack = [x for x in stack if isinstance(x, str) and x.startswith('/')]
                
    # Group elements by page-level layouts
    # Let's sort elements by Y descending (top-to-bottom), then by X ascending (left-to-right)
    elements.sort(key=lambda e: (-e[0], e[1]))
    
    print(f'\n=== PAGE {page_idx+1} ===')
    for el in elements:
        # Ignore background page decorations (large w/h)
        # We only want small image icons
        print(f'Y={el[0]:.1f}, X={el[1]:.1f}: {el[3]}')
