# Isolated LibreOffice conversion service

2026-10-16. Preparation only. No host purchased, no container started, no production route changed. The existing ConvertAPI outage is not repaired by the browser tool release.

## Hosting and cost before implementation

Use a separate Linux container host, initially 2 vCPU and 4 GB RAM with at least 10 GB free disk. Native LibreOffice cannot execute in the current standard Cloudflare Worker. No suitable owned host or Docker runtime is available in this workspace, so a reliable zero-additional-cost server deployment is not established.

Software has no conversion subscription fee. On an already owned host, incremental rental can be zero, but electricity, traffic and maintenance remain costs. As a pricing reference only, Hetzner's official June 2026 adjustment lists the European CX23 at $6.49/month excluding IPv4 and VAT, with availability variable. Budget $10–20/month including basic operational overhead as an estimate, not a purchase quote or capacity guarantee. A specific host, region, taxes, backups and egress must be approved before purchase. Source: https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/ . No paid infrastructure is authorized or provisioned here.

## Prepared implementation choice

Use maintained Gotenberg 8.34+ LibreOffice conversion behind an authenticated private gateway. Pin a reviewed image by digest before deploying. Its official /forms/libreoffice/convert accepts DOCX/XLSX/PPTX and legacy Office inputs. Keep public PDFHope routes on the current Worker; switch the three forward conversions only after host approval and quality certification. Do not redirect reverse PDF-to-Office routes to LibreOffice: that is a different reconstruction problem.

Deployment sequence for an approved host:

1. Install Docker from its official repository and verify kernel/container isolation. Do not install LibreOffice in the Worker.
2. Pin the Gotenberg image; inventory its LibreOffice version, fonts, licenses and security patches. Disable Chromium, webhook, URL and debug routes not needed for Office conversion. Configure bounded API/LibreOffice timeouts and queue lengths using the pinned version's documented flags.
3. Place Gotenberg on a private container network reachable only by a gateway. Bind no conversion port to the public interface. The gateway authenticates Worker service credentials from encrypted secrets and accepts only fixed conversion modes, never a caller-supplied target URL.
4. The gateway streams uploads with a 10 MiB hard limit; admission limits are one job running, two waiting, 120 seconds/job, 50 MiB output, 256 MiB tmpfs and two CPU/2 GiB memory per conversion container. Return 429/503 when capacity is exhausted. Treat these as initial configuration targets, not measured performance.
5. Validate the complete Office ZIP/OLE structure before parsing: bounded streaming inflation and CRC, no encrypted archives, macros, embedded executables, unsafe relationship URLs, DTD/entities, traversal, duplicate entries or unbounded expansion. A filename, MIME type, magic number or incidental ZIP marker is not a sufficient boundary. Include an antivirus/malware scan; reject if required inspection fails.
6. Run a non-root job with read-only root filesystem, no host mounts, all capabilities dropped, no-new-privileges, PID limits, per-job temporary directory and isolated LibreOffice profile. Block outbound network at the container firewall; patch the engine and fonts regularly. Gotenberg's linked-content suppression and outbound filtering are additional layers, not replacements for network isolation.
7. Use an external supervisor to kill the entire job/container on timeout, disconnect or output/disk limit. Stream a verified application/pdf response, then remove temporary bytes in all success/error/crash paths. Reap abandoned job directories at startup and on a bounded schedule. Do not log filenames or document content.
8. Maintain existing per-IP conversion rate limiting and add persistent global/day admission limits so multiple Worker instances cannot overwhelm the native host. Keep these limits independent of AI budgets.
9. Before connecting production: pass the fixture suite below, load tests, restart/cleanup tests and privacy checks; record peak RSS and p50/p95 latency. Verify TLS, auth rotation and fail-closed outage behavior. Then request approval for the concrete production binding/route change and deploy with rollback available.

## Capacity and expected fidelity

One serial converter theoretically processes 30 jobs/hour if every job consumes the full 120-second deadline, or 180/hour at 20 seconds each. These are arithmetic ceilings before queueing and overhead, not measured capacity; start with a lower admission ceiling after benchmarks. Do not advertise unlimited conversion.

LibreOffice generally reconstructs ordinary Office text, tables and images, but exact Microsoft Office parity is not guaranteed. Fonts, charts, pagination, headers/footers, linked content and complex slide layouts can differ. Install only appropriately licensed fonts. Unsupported input must produce a clear error rather than a misleading PDF.

Required quality suite: DOCX multi-page headings/tables/images/headers/footers/page breaks; XLSX multiple sheets/merged cells/charts/formulas/print areas; PPTX multiple slides/fonts/charts/SmartArt/notes/complex layouts. Open each original in a real Office viewer, render converted pages, compare text and page counts and visually review every page. Include malformed, macro-enabled, ZIP bomb, encrypted, timeout, concurrency and cleanup cases. No such native conversion or fidelity test has been run here; server status remains BLOCKED pending approved host and this validation.

Official implementation references: https://gotenberg.dev/docs/convert-with-libreoffice/convert-to-pdf , https://gotenberg.dev/docs/configuration , https://gotenberg.dev/docs/outbound-url-filtering . This document is a deployment blueprint, not a claim that a hardened service exists.
