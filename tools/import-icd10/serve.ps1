# Local server for the ICD-10 import tool, rooted at this folder; POST /save?name=<file> writes the body to .\out\<file>.
# Run: powershell -ExecutionPolicy Bypass -File tools\import-icd10\serve.ps1, then open http://localhost:8091/extract.html
param([int]$Port = 8091)
$root = $PSScriptRoot
New-Item -ItemType Directory -Force (Join-Path $PSScriptRoot 'out') | Out-Null
$out = (Resolve-Path (Join-Path $PSScriptRoot 'out')).Path
$types = @{ '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript'; '.pdf' = 'application/pdf'; '.json' = 'application/json' }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$Port/"
while ($listener.IsListening) {
  $ctx = $listener.GetContext(); $req = $ctx.Request; $res = $ctx.Response
  try {
    if ($req.HttpMethod -eq 'POST' -and $req.Url.AbsolutePath -eq '/save') {
      $name = [IO.Path]::GetFileName($req.QueryString['name'])
      $fs = [IO.File]::Create((Join-Path $out $name))
      $req.InputStream.CopyTo($fs); $fs.Close()
      $bytes = [Text.Encoding]::UTF8.GetBytes('saved')
    } else {
      $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
      $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
      if (-not $path.StartsWith($root) -or -not (Test-Path -LiteralPath $path -PathType Leaf)) { $res.StatusCode = 404; $bytes = [Text.Encoding]::UTF8.GetBytes('404') }
      else { $ext = [IO.Path]::GetExtension($path).ToLower(); if ($types.ContainsKey($ext)) { $res.ContentType = $types[$ext] }; $bytes = [IO.File]::ReadAllBytes($path) }
    }
    $res.ContentLength64 = $bytes.Length; $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch { $res.StatusCode = 500 } finally { $res.OutputStream.Close() }
}
