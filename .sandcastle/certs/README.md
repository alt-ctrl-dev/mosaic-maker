# Extra CA certificates for the sandbox image

Drop PEM-encoded `*.crt` files here. The Dockerfile copies them into
`/usr/local/share/ca-certificates/` and runs `update-ca-certificates`, and sets
`NODE_EXTRA_CA_CERTS` so Node/`pi` trusts them too. Empty directory = no-op.

`*.crt` here is gitignored: these certs are machine/network specific.

## Why you might need this

On a corporate network that does TLS inspection, the sandbox container sees a
proxy-issued certificate for `openrouter.ai` and cannot verify it. Symptom: `pi`
returns empty assistant messages with `"errorMessage":"Connection error."`, and
Sandcastle then falls back to raw stdout and fails with
`StructuredOutputError: Structured output tag <plan> contains invalid JSON`.

Confirm with:

```bash
docker run --rm --entrypoint sh sandcastle:mosaic-maker \
  -c 'curl -sS -m 20 -o /dev/null -w "%{http_code}\n" https://openrouter.ai/api/v1/models'
```

`SSL certificate problem: self-signed certificate in certificate chain` = you need
the corporate root here.

## Exporting the root CA on Windows

Find the issuer of the intercepted certificate, then export that root (and any
intermediate) from the Windows certificate store:

```powershell
# 1. Who signed the intercepted cert?
$c = [Net.Sockets.TcpClient]::new('openrouter.ai',443)
$s = [Net.Security.SslStream]::new($c.GetStream(),$false,({$true}))
$s.AuthenticateAsClient('openrouter.ai')
([Security.Cryptography.X509Certificates.X509Certificate2]$s.RemoteCertificate).Issuer

# 2. Export the matching root/intermediate from the machine store to PEM.
#    Replace the thumbprints with the ones for your corporate CA.
$out = @()
foreach ($tp in '<ROOT_THUMBPRINT>', '<INTERMEDIATE_THUMBPRINT>') {
  $cert = Get-ChildItem -Recurse Cert:\LocalMachine | Where-Object Thumbprint -eq $tp | Select-Object -First 1
  if ($cert) {
    $out += '-----BEGIN CERTIFICATE-----'
    $out += [Convert]::ToBase64String($cert.RawData,'InsertLineBreaks')
    $out += '-----END CERTIFICATE-----'
  }
}
Set-Content .sandcastle/certs/corp-ca.crt $out -Encoding ascii
```

Then rebuild the image: `pnpm sandcastle-build-image`.
