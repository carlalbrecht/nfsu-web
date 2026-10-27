"""Exercise the local asset server's read-only boundary and range responses."""
from http.client import HTTPConnection
from pathlib import Path
import json
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).parents[1]


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(); cls.data = Path(cls.tmp.name)/'game'; cls.data.mkdir()
        (cls.data/'asset.bin').write_bytes(b'0123456789')
        outside = cls.data.parent/'outside.bin'; outside.write_bytes(b'private')
        (cls.data/'link.bin').symlink_to(outside)
        cls.proc = subprocess.Popen([sys.executable, str(ROOT/'web/server.py'), '--data', str(cls.data), '--port', '0'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        line = cls.proc.stdout.readline().strip()
        if not line.startswith('Underground development build: '):
            cls.proc.terminate(); cls.proc.wait(timeout=5)
            raise RuntimeError('Server failed to start: '+cls.proc.stderr.read())
        cls.port = int(line.rsplit(':', 1)[1].strip('/'))

    @classmethod
    def tearDownClass(cls):
        cls.proc.terminate(); cls.proc.communicate(timeout=5); cls.tmp.cleanup()

    def request(self, method, path, headers=None):
        c=HTTPConnection('127.0.0.1', self.port, timeout=5)
        try:
            c.request(method, path, headers=headers or {})
            r=c.getresponse(); return r.status, dict(r.getheaders()), r.read()
        finally: c.close()

    def test_manifest_ranges_and_isolation_headers(self):
        status, headers, body = self.request('GET', '/data-manifest')
        self.assertEqual(status, 200)
        self.assertEqual([f['p'] for f in json.loads(body)['files']], ['asset.bin'])
        self.assertEqual(headers['Cross-Origin-Opener-Policy'], 'same-origin')
        self.assertEqual(headers['Cross-Origin-Embedder-Policy'], 'require-corp')
        status, headers, body = self.request('GET', '/data/asset.bin', {'Range':'bytes=2-5'})
        self.assertEqual((status, body), (206,b'2345')); self.assertEqual(headers['Content-Range'],'bytes 2-5/10')
        status, headers, body = self.request('HEAD', '/data/asset.bin')
        self.assertEqual((status,body,headers['Content-Length']), (200,b'','10'))
        self.assertEqual(self.request('GET','/data/asset.bin',{'Range':'bytes=10-'})[0],416)

    def test_no_writes_or_escape_from_asset_root(self):
        for path in ('/data/%2e%2e/outside.bin', '/data/link.bin', '/%2e%2e/package.json'):
            self.assertEqual(self.request('GET',path)[0],404)
        self.assertEqual(self.request('POST','/data/asset.bin')[0],501)
        self.assertEqual((self.data/'asset.bin').read_bytes(),b'0123456789')


if __name__ == '__main__': unittest.main()
