# Autonomous Agentic Playwright Test Automation Framework

An AI-driven UI test automation framework built on top of **Playwright**, **TypeScript**, and **LLM Agents**. It transforms plain-English business requirements into resilient, self-healing automated browser test executions without requiring manual Page Object Models (POMs) or brittle hardcoded locators.

---

## 🌟 Key Features

* 🤖 **Tri-Agent Architecture**:
  * **Planner Agent**: Ingests requirements (Markdown, Gherkin, Plain Text, JSON) and synthesizes stateful atomic step graphs.
  * **Generator Agent**: Dynamically inspects DOM snapshots and accessibility trees to resolve locators at runtime.
  * **Healer Agent**: Intercepts UI failures, diagnoses element drift, generates repaired locators live in the browser, and self-heals broken execution steps autonomously.
* 🌐 **Multi-Browser & Execution Modes**:
  * Native support for **Chromium**, **Firefox**, and **WebKit** (Safari engine).
  * Seamless toggling between **Headed** and **Headless** execution modes.
* ⚡ **Locator Registry Caching**:
  * Caches high-confidence locators in `config/locator.registry.json` to accelerate subsequent test runs.
* 🔒 **Security & Data Masking**:
  * Automatic redaction of sensitive data patterns (`password`, `secret`, `token`, `credit_card`) prior to sending prompts to LLM providers.
* 📊 **Interactive HTML Reporting & Auditing**:
  * Rich HTML execution reports with execution metrics, browser engine metadata, execution mode indicators (`HEADED`/`HEADLESS`), and detailed self-healing audit logs.

---

## 🏗️ Project Architecture

```
playwrightFramework01/
├── config/
│   ├── framework.config.ts    # Global framework configuration loader
│   └── locator.registry.json  # Cached locator registry
├── scenarios/                 # Test scenario specs (.md, .txt, .feature, .json)
├── src/
│   ├── agents/                # AI Agents (Planner, Generator, Healer)
│   ├── engine/                # BrowserManager, ActionDispatcher, FailureInterceptor
│   ├── extractor/             # DOM & Accessibility State Extractor
│   ├── ingestor/              # Requirement Ingestor (Markdown, Gherkin, Plain Text, JSON)
│   ├── orchestrator/          # Execution Pipeline orchestrator
│   ├── registry/              # Dynamic Locator Registry manager
│   ├── reporter/              # HTML Reporter & Self-Healing Audit Reporter
│   ├── schemas/               # Zod data schemas
│   ├── utils/                 # Logger & Data Masking utilities
│   └── cli.ts                 # CLI entrypoint
├── artifacts/                 # Test run execution reports, traces, and videos
├── .env.example               # Environment variables template
├── package.json               # NPM scripts and dependencies
└── tsconfig.json              # TypeScript configuration
```

---

## 🚀 Quick Start

### 1. Prerequisites

* **Node.js**: `v20.0.0` or higher
* **npm**: `v10.0.0` or higher

### 2. Installation

Clone the repository and install dependencies:

```bash
# Clone the repository
git clone <repository-url>
cd playwrightFramework01

# Install Node.js packages
npm install

# Install Playwright browser binaries
npx playwright install --with-deps
```

### 3. Environment Setup

Create a `.env` file in the root directory (refer to `.env.example`):

```env
# Target Environment Configuration
BASE_URL=https://www.saucedemo.com

# LLM Provider Credentials
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
LLM_MODEL=gpt-4o

# Framework Execution Settings
HEADLESS=true
BROWSER=chromium
SLOW_MO=0
DEFAULT_TIMEOUT=30000

# Security & Data Masking
MASK_SENSITIVE_DATA=true
SECRET_PATTERNS=password,secret,token,credit_card

# Locator Registry Caching
ENABLE_LOCATOR_REGISTRY=true
REGISTRY_PATH=./config/locator.registry.json
```

---

## 💻 Running Scenarios via CLI

Use the built-in CLI to execute test scenarios:

### 1. Basic Scenario Execution (Chromium Headless)
```bash
npm run run:scenario -- -s scenarios/herokuapp_login.md
```

### 2. Running in Specific Browsers
```bash
# Run in Firefox
npm run run:scenario -- -s scenarios/herokuapp_login.md -b firefox

# Run in WebKit (Safari Engine)
npm run run:scenario -- -s scenarios/herokuapp_login.md -b webkit
```

### 3. Running in Headed Mode (Visual Browser Window)
```bash
# Run Headed with slow motion delay (500ms between actions)
npm run run:scenario -- -s scenarios/herokuapp_login.md -h --slowMo 500
```

### 4. Planner Agent Step Dry-Run (`--plan-only`)
Synthesize atomic step graph without launching browser:
```bash
npm run run:scenario -- -s scenarios/herokuapp_login.md --plan-only
```

---

## 📊 Viewing Test Reports

After scenario execution completes, reports are automatically generated in the `artifacts/` folder:

```
artifacts/<TIMESTAMP>/reports/execution_report.html
```

To view the latest report in your default browser on Windows (PowerShell):

```powershell
Invoke-Item (Get-ChildItem -Recurse artifacts\*\reports\execution_report.html | Select-Object -Last 1).FullName
```

The report features:
- **Execution Overview**: Total, Passed, Self-Healed, and Failed step counts.
- **Browser Environment**: Displays `Browser Engine` (`CHROMIUM`, `FIREFOX`, `WEBKIT`) and `Mode` (`HEADED` vs `HEADLESS`).
- **Step Execution Graph**: Displays intent, target element descriptions, locators used, and duration.
- **Self-Healing Actions**: Details on dynamic repairs performed by the Healer Agent.

---

## 🛠️ Development Scripts

```bash
# Compile TypeScript code
npm run build

# Run unit tests
npm test
```

---

## 📄 License

Distributed under the MIT License.
