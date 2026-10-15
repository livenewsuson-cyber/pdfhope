# Homepage only release QA

2026-10-15. Based on production main b0d62b4856c7318010aa6d96765812a213263da6. Recovered HomePage.tsx and homepage-compact.css from eea3b1b without its Agent ancestors. Changed only the promotional link to a semantic noninteractive aside with the requested Coming Soon label and responsive status styling. No AI requests, Agent routes, Worker changes, conversion experiments or new dependencies.

Original codex/ai-agent-local checkout and every pending change remain untouched in pdfhope-branding. Release is isolated in pdfhope-homepage-release on codex/homepage-coming-soon.

Pre-release checks: TypeScript PASS; ESLint PASS (existing vendor warning); original production suite 105 tests PASS; production build PASS; SEO audit PASS for 64 routes, seven hubs, seven guides and 39 tool schemas. Two additional homepage regression tests cover H1/search/SEO sections and the noninteractive Agent panel. Desktop 1440x1000 and mobile 390x844 inspected in a real browser in both light/dark themes. Search results and Ctrl+K dialog passed. Desktop hero stays compact; mobile panel has readable status and no Agent link.

Production Worker, conversion rate limiter and configuration match main. Existing secrets and variables must be retained with --keep-vars. Verify uploaded version binding types before activation. No AI endpoints are present in the release source. Six Office conversions have a pre-existing unavailable provider and are not claimed repaired. Existing local PDF operations are covered by the production test suite; live smoke verification follows activation.
