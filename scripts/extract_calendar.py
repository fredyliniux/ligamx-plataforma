import hashlib
import pypdf
import json

pdf_path = '/Users/fredyreyes/.gemini/antigravity/brain/e2dbc227-906f-45db-8c5c-132ca8ff1603/media__1785194158049.pdf'
reader = pypdf.PdfReader(pdf_path)

# 1. Base team image hashes mapped to names
hash_to_team = {
    '150d5168ad1b057b755e385e4e7f5d4d': 'Necaxa',
    '0161c94a23...': 'Atlante',  # Let's use full hash below
    'c9105ef8dc...': 'Tijuana',
    '4e12742a3e...': 'Tigres UANL',
    '08cdf91935...': 'Atlético de San Luis',
    'c3e02920c9...': 'Cruz Azul',
    '742ba403ff...': 'León',
    '7a5a5c74d9...': 'Atlas',
    '5c66d8a95e...': 'Juárez',
    '8e605dcc88...': 'Puebla',
    'c655be5131...': 'Pumas UNAM',
    '4698905efa...': 'Pachuca',
    '4412132567...': 'Guadalajara',
    '6a78094fd8...': 'Toluca',
    '6f8d8a51c8...': 'Monterrey',
    'd62c38fcd6...': 'Santos Laguna',
    'd50286708a...': 'Querétaro',
    'de22659298...': 'América'
}

# Real hashes from page 2 output:
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
    'ff57dad94a1b057b755e385e4e7f5d4d': 'Mazatlán'  # We will test if this matches Mazatlán
}

# Let's map page indices to Jornada lists
# Page 2: J1 (left), J2 (right)
# Page 3: J3 (left), J4 (left bottom?), J5 (right) -> Wait, we can detect Jornada by reading the text or coordinates!
# Let's write a parser that parses text and coordinate boxes!
