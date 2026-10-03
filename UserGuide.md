# User Guide: Autonomous Agentic Playwright Test Automation Framework

Welcome to the **Autonomous Agentic Playwright Test Automation Framework**. This guide provides comprehensive instructions for configuring, running, writing test requirements for, and analyzing results from the autonomous agentic framework.

---

## 1. System Overview & Core Concepts

Traditional UI test automation requires writing rigid Page Object Models (POMs) and maintaining brittle XPaths/CSS selectors. This framework changes that paradigm by introducing **Autonomous Agentic AI** built directly on top of **Playwright**.

### 1.1 How It Works
1. **Plain-English Input**: You provide high-level test scenarios in plain text, Markdown, Gherkin, or JSON.
2. **Autonomous Planning**: The **Planner Agent** breaks business requirements into stateful atomic execution steps.
3. **Dynamic Generation & Execution**: The **Generator Agent** inspects live page DOMs and Accessibility Trees at runtime to synthesize Playwright actions dynamically without pre-coded locators.
4. **Self-Healing Mechanics**: If UI changes break a locator or interaction, the **Healer Agent** intercepts the failure, diagnoses element drift, generates and verifies repaired locators live in the browser, and patches the execution context automatically.

---

## 2. Prerequisites & Environment Setup

### 2.1 System Requirements
* **Node.js**: v20.0.0 LTS or higher
* **npm**: v10.0.0 or higher
* **Operating System**: Windows 10/11, macOS, or Linux
* **Browser Engines**: Chromium, Firefox, or WebKit (managed via Playwright)

### 2.2 Installation Steps
Clone the project repository and install required dependencies:

```bash
# Clone the workspace
git clone <repository-url>
cd playwrightFramework01

# Install Node.js dependencies
npm install

# Install Playwright browser binaries
npx playwright install --with-deps
```

### 2.3 Environment Configuration (`.env`)
Create a `.env` file in the project root directory:

```env
# Target Environment Configuration
BASE_URL=https://www.saucedemo.com

# LLM Provider Credentials
LLM_PROVIDER=openai # Options: openai, anthropic, azure, local
OPENAI_API_KEY=sk-proj-your-api-key-here
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

> [!IMPORTANT]
> Never commit `.env` files or raw API keys to version control. Passwords and credentials referenced in test scenarios are automatically masked from LLM prompts when `MASK_SENSITIVE_DATA=true`.

---

## 3. Test Requirement Ingestion Formats

The framework natively ingests four requirement formats. Save scenario files inside the `./scenarios/` directory.

### 3.1 Plain-Text Scenarios (`.txt`)
Simple plain-English descriptions of user journeys.

```text
Navigate to sauce-demo.
Log in with standard user credentials.
Add the Swag Labs Backpack to the shopping cart.
Proceed to checkout and enter user details (First Name: John, Last Name: Doe, Zip: 12345).
Verify checkout total is $32.39.
```

### 3.2 Markdown User Stories (`.md`)
Structured requirements formatted with user story headers and acceptance criteria.

```markdown
# User Story: E-Commerce Product Purchase

## Context
As an authenticated user, I want to purchase an item so that it ships to my address.

## Acceptance Criteria
1. User navigates to the login page at `${BASE_URL}`.
2. User logs in with username `standard_user` and password `secret_sauce`.
3. User selects the "Sauce Labs Backpack" and clicks "Add to Cart".
4. User opens the shopping cart and clicks "Checkout".
5. User fills out the checkout form with valid shipping info.
6. System verifies that the final payment summary matches `$32.39`.
```

### 3.3 Gherkin / BDD Scenarios (`.feature`)
Standard BDD scenarios using `Feature`, `Scenario`, `Given`, `When`, `Then` blocks.

```gherkin
Feature: Shopping Cart Verification

  Scenario: User completes checkout successfully
    Given User is on the login page
    When User logs in with "standard_user" and password "secret_sauce"
    And User adds "Sauce Labs Backpack" to the cart
    And User proceeds through checkout with name "Jane Doe" and zip "90210"
    Then The system should display order confirmation with total "$32.39"
```

### 3.4 Structured JSON Test Cases (`.json`)
Pre-structured test steps for programmatic or API-driven execution.

```json
{
  "testCaseId": "TC-BUY-001",
  "title": "Complete Product Purchase",
  "baseUrl": "https://www.saucedemo.com",
  "requirements": [
    "Log in with standard credentials",
    "Add Sauce Labs Backpack to cart",
    "Complete checkout and verify price"
  ]
}
```

---

## 4. Running Execution Commands

Execute tests using the framework CLI:

### 4.1 Standard Headless Run
```bash
npx ts-node src/cli.ts run --spec scenarios/purchase_flow.md
```

### 4.2 Interactive / Headed Debugging Run
Run in headed browser mode with `slowMo` delay to observe real-time agent execution:

```bash
npx ts-node src/cli.ts run \
  --spec scenarios/purchase_flow.md \
  --browser chromium \
  --headed \
  --slowMo 500
```

### 4.3 Running Against Specific Environments
Override default target URLs and environment settings:

```bash
npx ts-node src/cli.ts run \
  --spec scenarios/purchase_flow.md \
  --url https://staging.saucedemo.com \
  --browser firefox
```

### 4.4 CLI Parameter Reference

| Flag | Full Option | Description | Default |
|---|---|---|---|
| `-s` | `--spec` | Path to scenario file (`.md`, `.txt`, `.feature`, `.json`) | Required |
| `-u` | `--url` | Target Base URL override | Config `.env` |
| `-b` | `--browser` | Browser engine: `chromium`, `firefox`, `webkit` | `chromium` |
| `-h` | `--headed` | Run browser visually (non-headless) | `false` |
| `--slowMo` | `--slowMo` | Delay between actions in ms | `0` |
| `-t` | `--timeout` | Action auto-wait timeout (ms) | `30000` |
| `--heal` | `--selfHeal` | Enable dynamic Healer Agent on failure | `true` |

---

## 5. Understanding Execution Outputs & Artifacts

After every run, test results and artifacts are saved to `./artifacts/<timestamp>/`.

```text
artifacts/2026-10-02_20-56-30/
├── reports/
│   ├── execution_report.html       # Visual HTML execution dashboard
│   ├── self_healing_audit.json     # Healing diffs and locator patch audit
│   └── run_summary.json            # Step timings, statuses, token usage
├── traces/
│   └── trace.zip                   # Full Playwright timeline & DOM trace
├── screenshots/
│   ├── failure_step_3.png          # Screenshots captured upon step failure
│   └── healed_step_3.png           # Screenshots captured after successful repair
└── config/
    └── locator.registry.json       # Updated cached element locators
```

### 5.1 Interactive HTML Execution Report
Open `artifacts/<timestamp>/reports/execution_report.html` in any browser to review:
* Step-by-step test execution timeline.
* Planner Agent's generated atomic step graph.
* Generator Agent's active locators and execution times.
* Pass/Fail status per atomic step.

### 5.2 Self-Healing Audit Report
When an element locator fails due to UI drift, the framework self-heals and generates an audit log:

```json
{
  "stepId": "step_003",
  "originalLocator": "button#add-to-cart-sauce-labs-backpack",
  "failureReason": "TimeoutError: element not found after 30000ms",
  "healedLocator": "button[data-test='add-to-cart-sauce-labs-backpack']",
  "confidenceScore": 0.96,
  "healingStatus": "SUCCESS",
  "reinspectionDurationMs": 1420
}
```

### 5.3 Playwright Trace Viewer
To inspect network traffic, action DOM states, and video recordings interactively:

```bash
npx playwright show-trace artifacts/2026-10-02_20-56-30/traces/trace.zip
```

### 5.4 Persisted Locator Registry
Verified locators are automatically saved to `config/locator.registry.json`. On subsequent runs, the framework attempts cached selectors first to minimize LLM token usage and reduce runtime latency.

---

## 6. Troubleshooting & Best Practices

### 6.1 Common Issues & Solutions

> [!WARNING]
> **Issue**: Test fails with `LLM Token Context Window Exceeded`.  
> **Solution**: Ensure dynamic page extraction filtering is active. The framework distills page DOMs into Accessibility Trees (`aria-snapshot`) automatically; avoid manually injecting huge raw HTML payloads into requirements.

> [!TIP]
> **Issue**: Element fails to interact because of dynamic overlay or cookie banner.  
> **Solution**: Mention preconditions explicitly in your scenario, e.g.: *"Accept cookie banner if present, then navigate to login."*

> [!CAUTION]
> **Issue**: Healer Agent repairs a locator, but click triggers the wrong element.  
> **Solution**: Check the healing confidence score in `self_healing_audit.json`. Adjust `HEALING_CONFIDENCE_THRESHOLD=0.85` in `.env` to reject low-confidence locator replacements.

---

## 7. CI/CD Integration

To execute autonomous tests inside GitHub Actions or GitLab CI/CD pipelines, use standard headless commands within a Docker container.

### 7.1 GitHub Actions Workflow Example (`.github/workflows/test.yml`)

```yaml
name: Autonomous Playwright Test Suite

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.48.0-noble

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Execute Autonomous Tests
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          BASE_URL: https://www.saucedemo.com
          HEADLESS: "true"
        run: npx ts-node src/cli.ts run --spec scenarios/purchase_flow.md

      - name: Upload Test Artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: execution-artifacts
          path: artifacts/
```
