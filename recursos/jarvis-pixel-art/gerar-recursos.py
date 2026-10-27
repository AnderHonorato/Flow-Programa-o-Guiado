"""Exportação determinística de geometria original; requer cairosvg e Pillow."""
from pathlib import Path
import json
import cairosvg
from PIL import Image, ImageDraw, ImageFont
RAIZ = Path(__file__).resolve().parents[2]
PASTA = Path(__file__).resolve().parent
ESTADOS = ['curioso','alegre','explicando','pensando','concentrado','orgulhoso','surpreso','preocupado','comemorando','descansando','apoiando']

def caminho(d, cor):
    return f'<path d="{d}" fill="{cor}"/>'

def desenho(estado, quadro=0):
    sorrindo = estado in ['alegre','orgulhoso','comemorando','apoiando']
    feliz = estado == 'comemorando'
    desloca = -1 if quadro == 2 else (-4 if quadro == 3 and estado in ['alegre','comemorando','surpreso'] else 0)
    g = f'<g transform="translate({1 if quadro == 3 else 0} {desloca})">'
    g += caminho('M31 18V9h3v9','#653B32')
    g += caminho('M32 6h7v4h-7zM29 9h5v4h-5z','#8F2D4A')
    g += caminho('M34 6h3v2h-3z','#EBA78B')
    g += caminho('M12 34h5v13h-5zM9 38h4v8H9z','#7F4435')
    g += caminho('M11 38h5v6h-5z','#D97757')
    gesto = 'translate(-5 -7) rotate(-25 49 34)' if estado == 'pensando' else ('rotate(-65 49 34)' if estado in ['explicando','orgulhoso'] or (feliz and quadro==3) else '')
    g += f'<g transform="{gesto}">'+caminho('M47 34h5v13h-5zM51 38h4v8h-4z','#7F4435')+caminho('M48 38h5v6h-5z','#D97757')+'</g>'
    g += caminho('M19 48h9v8h-9zM36 48h9v8h-9z','#653B32')
    g += caminho('M17 53h11v4H17zM36 53h11v4H36z','#8F2D4A')
    g += caminho('M21 16h22v3h5v5h3v23h-3v5H17v-5h-3V24h3v-5h4z','#653B32')
    g += caminho('M21 19h22v3h5v24h-3v3H19v-3h-2V25h3v-3h1z','#D97757')
    g += caminho('M22 19h20v3H22zM19 23h3v6h-3z','#F2AD87')
    g += caminho('M22 25h20v2h4v14h-3v3H21v-3h-3V28h4z','#FFEDD4')
    g += caminho('M23 25h18v2H23zM20 28h3v2h-3z','#FFFFFF')
    if estado=='descansando' and quadro==1: olhos='M23 34h6v1h-6zM35 34h6v1h-6z'
    elif quadro==1 or estado=='descansando': olhos='M23 33h6v2h-6zM35 33h6v2h-6z'
    elif sorrindo: olhos='M23 31h2v-2h3v2h2v3h-2v-2h-3v2h-2zM34 31h2v-2h3v2h2v3h-2v-2h-3v2h-2z'
    elif estado=='surpreso': olhos='M24 28h4v8h-4zM36 28h4v8h-4z'
    elif estado=='concentrado': olhos='M26 30h4v6h-4zM38 30h4v6h-4z'
    else: olhos='M24 30h4v6h-4zM36 30h4v6h-4z'
    g += caminho(olhos,'#362723')
    if estado=='preocupado':g += caminho('M23 28h3v-2h3v2h-3v2h-3zM35 26h3v2h3v2h-3v-2h-3z','#653B32')
    if estado=='pensando':g += caminho('M23 27h7v2h-7zM35 26h6v2h-6z','#653B32')
    g += caminho('M21 37h4v2h-4zM39 37h4v2h-4z','#E9A38A')
    boca = 'M30 37h4v5h-4z' if estado=='surpreso' else 'M29 40h2v-2h3v2h2v2h-2v-2h-3v2h-2z' if estado=='preocupado' else 'M29 38h2v2h3v-2h2v3h-2v1h-3v-1h-2z'
    g += caminho(boca,'#653B32')
    g += caminho('M19 46h26v4H19zM37 49h6v6h-6z','#8F2D4A')
    g += caminho('M25 47h5v2h-5z','#F7C7A4')
    if feliz:g += caminho('M6 14h3v4H6zM53 18h4v3h-4zM11 7h3v3h-3z','#8F2D4A')+caminho('M48 8h3v5h-3zM5 28h3v3H5zM56 30h3v4h-3z','#D97757')
    if estado=='pensando':g += caminho('M48 15h3v3h-3zM53 10h4v4h-4z','#8F2D4A')
    if estado=='descansando':g += caminho('M46 10h7v2h-3v2h3v2h-7v-2h3v-2h-3z','#8F2D4A')
    return g+'</g>'

def svg(conteudo, largura=64, altura=64):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {largura} {altura}" width="{largura}" height="{altura}" shape-rendering="crispEdges"><title>J.A.R.V.IS. — pixel art original Flow</title>{conteudo}</svg>'

folha = ''
for i, estado in enumerate(ESTADOS):
    (PASTA/f'{estado}.svg').write_text(svg(desenho(estado)))
    for q in range(4):folha += f'<g transform="translate({q*64} {i*64})">{desenho(estado,q)}</g>'
(PASTA/'spritesheet.svg').write_text(svg(folha,256,704))
cairosvg.svg2png(url=str(PASTA/'spritesheet.svg'),write_to=str(PASTA/'spritesheet.png'))
for n in [192,512]:
    cairosvg.svg2png(url=str(RAIZ/'aplicativos/web/public/icone.svg'),write_to=str(RAIZ/f'aplicativos/web/public/icone-{n}.png'),output_width=n,output_height=n)
(PASTA/'spritesheet.json').write_text(json.dumps({'nome':'J.A.R.V.IS.','licenca':'Arte original criada para Flow Programação Guiada','grade':{'largura':64,'altura':64,'colunas':4,'linhas':11},'quadros':['repouso','piscar','respirar','reagir'],'estados':{e:{'x':0,'y':i*64,'quadros':4} for i,e in enumerate(ESTADOS)}},ensure_ascii=False,indent=2))
# Prancha de inspeção: rotulada e ampliada sem suavizar os pixels.
prancha=Image.new('RGB',(800,660),'#F5F2ED');d=ImageDraw.Draw(prancha)
sprites=Image.open(PASTA/'spritesheet.png')
for i,e in enumerate(ESTADOS):
 x=(i%4)*200;y=(i//4)*220
 r=sprites.crop((0,i*64,64,(i+1)*64)).resize((160,160),Image.Resampling.NEAREST)
 prancha.paste(r,(x+20,y+8),r);d.text((x+20,y+178),e,fill='#2F2522')
prancha.save(PASTA/'prancha-estados.png')
print('11 estados, folha 256x704, prancha 800x660, ícones 192 e 512 exportados.')
