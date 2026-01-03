# ADR 002: Why PWA (Progressive Web App)?

## Context
"Rootine" is a personal habit tracker intended primarily for daily use on a mobile device. The goal is to have a frictionless, native-app-like experience without the overhead of maintaining separate codebases for iOS and Android or dealing with App Store submission processes.

## Options Considered
1. **Native Mobile App (Swift/Kotlin)**: Best performance, but requires learning two languages/ecosystems and maintaining two codebases.
2. **Cross-Platform (React Native / Flutter)**: Single codebase, but adds complexity and abstraction layers. Still requires build pipelines and store approval.
3. **Responsive Web App**: Accessible via browser, but feels like a "website" (browser chrome, reload behavior, lack of offline support).
4. **PWA (Progressive Web App)**: Web technologies (HTML/CSS/JS) enhanced to behave like an app.

## Decision
I chose **PWA (Progressive Web App)**.

## Detailed Reasoning

### 1. Mobile-First UX
I am designing "Rootine" to feel native. This means:
- **Bottom Navigation**: Easier for thumb reachability.
- **Vaul Drawers**: Using pull-up drawers (like iOS sheets) instead of modals or new pages for actions.
- **Touch Targets**: Minimum 44px for all interactive elements.
- **Standalone Mode**: When installed, the browser URL bar and controls are hidden, providing an immersive experience.

### 2. Zero Friction Deployment
I can deploy updates instantly via Vercel. There is no "waiting for review" from Apple or Google. Users get the latest version immediately upon reload.

### 3. Installability
Users can "Add to Home Screen" to get an app icon. This lowers the barrier to entry compared to downloading an 50MB+ binary from a store.

### 4. Leverage Existing Skills
I am proficient in Web Technologies (SvelteKit, Tailwind). PWA allows me to use these skills to build a mobile app without learning a new framework like Flutter or React Native.

## Consequences
- **Positive**: Single codebase for Web and Mobile. Instant updates. Native-like feel via rigorous UI/UX design (Shadcn/Vaul).
- **Negative**: No access to some low-level native APIs (though Web APIs are catching up). iOS Safari has some PWA limitations (e.g., push notification nuances, gesture conflicts) that require workarounds.
