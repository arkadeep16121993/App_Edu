"""Package the public guest app into an HTML file that needs no local server."""
import base64
import mimetypes
import pathlib
import re

root = pathlib.Path(__file__).resolve().parent.parent
client = root / 'dist/client'
html = (client / 'index.html').read_text()
js_match = re.search(r'<script[^>]+src="([^"]+)"[^>]*></script>', html)
css_match = re.search(r'<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>', html)
if not js_match or not css_match:
    raise SystemExit('Expected a built single-entry client; run npm run build.')
js = (client / js_match[1].lstrip('/')).read_text()
css = (client / css_match[1].lstrip('/')).read_text()
def inline_asset(match):
    source = match[1].strip('"\'')
    if source.startswith('data:'):
        return match[0]
    asset = (client / source.lstrip('/')).resolve()
    if not asset.is_relative_to(client.resolve()) or not asset.is_file():
        raise SystemExit(f'Missing or unsafe bundled asset: {source}')
    mime = mimetypes.guess_type(asset.name)[0] or 'application/octet-stream'
    return 'url(data:' + mime + ';base64,' + base64.b64encode(asset.read_bytes()).decode() + ')'
css = re.sub(r'url\(([^)]+)\)', inline_asset, css)
preview_api = '''
const originalFetch=window.fetch.bind(window);
window.fetch=(input,init)=>{
 const path=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href).pathname;
 if(path.startsWith('/api/')){
  const config={accountsEnabled:false,billingEnabled:false,contentReady:false};
  const body=path==='/api/v1/config'?config:path==='/api/auth/get-session'?null:{code:'PREVIEW_ONLY',message:'This file is a guest-only preview. No cloud accounts or billing are connected.'};
  return Promise.resolve(new Response(JSON.stringify(body),{status:path==='/api/v1/config'||path==='/api/auth/get-session'?200:503,headers:{'Content-Type':'application/json'}}));
 }
 return originalFetch(input,init);
};
'''
html = html.replace(js_match[0], '<script>'+preview_api+'</script>\n<script type="module">'+js.replace('</script', '<\\/script')+'</script>')
html = html.replace(css_match[0], '<style>'+css+'</style>')
html = re.sub(r'<link[^>]+rel="manifest"[^>]*>', '', html)
icon = 'data:image/svg+xml;base64,'+base64.b64encode((client/'icon.svg').read_bytes()).decode()
html = html.replace('href="/icon.svg"', 'href="'+icon+'"')
html = re.sub(r'<title>.*?</title>', '<title>Physics Path · Standalone guest preview</title>', html)
output = root / 'dist/releases/physics-path-open-me.html'
output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(html)
print(f'{output} ({output.stat().st_size:,} bytes)')
