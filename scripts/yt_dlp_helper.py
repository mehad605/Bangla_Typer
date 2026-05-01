import shutil
import subprocess
import json
import logging
import os
from typing import Any, Dict, List, Optional

try:
    import yt_dlp
except ImportError:
    yt_dlp = None

class YoutubeDL:
    """
    A wrapper around yt-dlp that prefers a system-installed binary over the 
    bundled Python library. Handles cross-platform quirks (Windows/Linux).
    """
    def __init__(self, params: Optional[Dict[str, Any]] = None):
        self.params = params or {}
        # shutil.which finds .exe on Windows and binary on Linux
        self.system_path = shutil.which('yt-dlp')
        self.ydl = None
        
        # Windows-specific: Prevent console window popup in GUI mode
        self.creation_flags = 0
        if os.name == 'nt':
            self.creation_flags = subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0x08000000

        if not self.system_path:
            if yt_dlp is None:
                raise ImportError("Neither system 'yt-dlp' nor bundled 'yt_dlp' library found.")
            self.ydl = yt_dlp.YoutubeDL(self.params)

    def __enter__(self):
        if self.ydl:
            self.ydl.__enter__()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.ydl:
            self.ydl.__exit__(exc_type, exc_val, exc_tb)

    def _get_args(self) -> List[str]:
        """Map YoutubeDL params to CLI arguments."""
        args = [self.system_path]
        p = self.params
        
        # Flags
        if p.get('quiet'): args.append('--quiet')
        if p.get('no_warnings'): args.append('--no-warnings')
        if p.get('noplaylist'): args.append('--no-playlist')
        if p.get('skip_download'): args.append('--skip-download')
        if p.get('writethumbnail'): args.append('--write-thumbnail')
        if p.get('writesubtitles'): args.append('--write-subs')
        if p.get('writeautomaticsub'): args.append('--write-auto-subs')
        if p.get('check_formats') is False: args.append('--no-check-formats')
        
        # Options with values
        if p.get('subtitleslangs'):
            args.extend(['--sub-langs', ','.join(p['subtitleslangs'])])
        if p.get('subtitlesformat'):
            args.extend(['--sub-format', p['subtitlesformat']])
        if p.get('outtmpl'):
            args.extend(['-o', str(p['outtmpl'])])
        if p.get('cookiefile'):
            args.extend(['--cookies', str(p['cookiefile'])])
        
        # Extractor args
        if p.get('extractor_args'):
            for ext, ext_args in p['extractor_args'].items():
                for k, v in ext_args.items():
                    val = ','.join(v) if isinstance(v, list) else v
                    args.extend(['--extractor-args', f"{ext}:{k}={val}"])
        
        return args

    def extract_info(self, url: str, download: bool = False) -> Dict[str, Any]:
        """Fetch metadata for a URL."""
        if self.ydl:
            return self.ydl.extract_info(url, download=download)
        
        args = self._get_args()
        args.append('--dump-json')
        if not download:
            args.append('--skip-download')
        args.append(url)
        
        try:
            result = subprocess.run(
                args, 
                capture_output=True, 
                text=True, 
                encoding='utf-8',
                errors='replace', # Prevent crash on decoding weird chars
                check=True,
                creationflags=self.creation_flags
            )
            return json.loads(result.stdout)
        except subprocess.CalledProcessError as e:
            err_msg = e.stderr or str(e)
            logging.error(f"yt-dlp binary error: {err_msg}")
            raise RuntimeError(err_msg)
        except Exception as e:
            logging.error(f"Error calling yt-dlp binary: {e}")
            raise

    def download(self, urls: List[str]) -> int:
        """Download one or more URLs."""
        if self.ydl:
            return self.ydl.download(urls)
        
        args = self._get_args()
        args.extend(urls)
        
        try:
            # We don't capture output here to allow live streaming if needed,
            # or just to let the binary handle its own stdout/stderr.
            result = subprocess.run(args, creationflags=self.creation_flags)
            return result.returncode
        except Exception as e:
            logging.error(f"Error calling yt-dlp binary for download: {e}")
            return 1
