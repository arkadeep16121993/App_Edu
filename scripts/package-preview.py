"""Create portable guest preview and source ZIPs; excludes credentials and caches."""
import argparse
import pathlib
import shutil
import subprocess
import tempfile
import zipfile

root = pathlib.Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=pathlib.Path, default=root / 'dist' / 'releases')
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
if not (root / 'dist/client/index.html').exists():
    raise SystemExit('Run npm run build before packaging.')
with tempfile.TemporaryDirectory(prefix='physics-path-package-') as temporary:
    preview = pathlib.Path(temporary) / 'physics-path-preview'
    shutil.copytree(root / 'dist/client', preview)
    shutil.copy2(root / 'scripts/start-preview.py', preview / 'start-preview.py')
    shutil.copy2(root / 'LOCAL-TESTING.md', preview / 'START-HERE.md')
    shutil.copy2(root / 'LICENSE', preview / 'LICENSE')
    (preview / 'START-WINDOWS.bat').write_text('@echo off\ncd /d "%~dp0"\nwhere py >nul 2>nul\nif errorlevel 1 (\n  python start-preview.py\n) else (\n  py -3 start-preview.py\n)\npause\n', newline='\r\n')
    preview_zip = args.output / 'physics-path-preview.zip'
    with zipfile.ZipFile(preview_zip, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(preview.rglob('*')):
            if path.is_file():
                archive.write(path, path.relative_to(preview.parent))
files = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=root).decode().split('\0')
source_zip = args.output / 'physics-path-source.zip'
with zipfile.ZipFile(source_zip, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in sorted(set(files)):
        if not name:
            continue
        path = root / name
        if path.is_symlink():
            raise SystemExit(f'Refusing symlink in source archive: {name}')
        if path.is_file():
            archive.write(path, pathlib.Path('physics-path') / name)
for path in (preview_zip, source_zip):
    print(f'{path} ({path.stat().st_size:,} bytes)')
