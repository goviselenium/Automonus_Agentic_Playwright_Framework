# Workflow Documentation: Autonomous Agentic Playwright Test Automation Framework

This document provides a complete conceptual and operational guide to the end-to-end execution workflow, decision trees, agent communication protocols, and state machines powering the **Autonomous Agentic Playwright Test Automation Framework**.

---

## 1. End-to-End Execution Flowchart

The following flowchart maps the complete lifecycle of a test execution run from requirement ingestion to final reporting.

```mermaid
flowchart TD
    Start(["🚀 Start CLI Execution"]) --> Ingest["1. Ingest Test Requirement Scenario\n(.md, .txt, .feature, .json)"]
    Ingest --> LoadEnv["Load Context & Sanitize Secrets (.env)"]
    LoadEnv --> LaunchBrowser["Initialize Playwright Browser & Context"]
    
    LoadEnv --> Planner["2. Planner Agent\nDecompose requirements into Atomic Step Graph"]
    Planner --> ValidatePlan{"Validate JSON against\nTestPlanSchema?"}
    ValidatePlan -- "No (Schema Error)" --> RetryPlan["Retry Planner Agent with Error Feedback"]
    RetryPlan --> Planner
    
    ValidatePlan -- "Yes (Valid Plan)" --> LoopStart["3. Begin Step Execution Loop"]
    
    LoopStart --> CheckRegistry{"Check Locator Registry\nfor Cached Target?"}
    CheckRegistry -- "Hit" --> UseCached["Fetch Cached Selector"]
    CheckRegistry -- "Miss" --> ExtractState["4. Extract Live Page State\n(aria-snapshot & Interactive DOM)"]
    
    ExtractState --> Generator["5. Generator Agent\nSynthesize Playwright Command"]
    UseCached --> Dispatcher
    Generator --> Dispatcher["6. Action Dispatcher\nExecute Playwright Action"]
    
    Dispatcher --> ExecCheck{"Step Action\nSucceeded?"}
    
    ExecCheck -- "PASS" --> LogStepOK["Log Step PASS & Record Metrics"]
    LogStepOK --> NextStep{"More Steps in\nPlan?"}
    NextStep -- "Yes" --> LoopStart
    NextStep -- "No" --> ReportGen
    
    ExecCheck -- "FAIL" --> Interceptor["7. Failure Interceptor Hook\nCapture Stack, DOM Snapshot, Screenshot"]
    Interceptor --> HealerCheck{"Is Self-Healing\nEnabled?"}
    
    HealerCheck -- "No" --> LogFail["Mark Step FAILED"]
    HealerCheck -- "Yes" --> Healer["8. Healer Agent\nAnalyze Drift & Generate Selectors"]
    
    Healer --> ConfidenceCheck{"Confidence Score >= 0.80 & Candidate Valid?"}
    ConfidenceCheck -- "No (Bug Detected)" --> LogFail
    ConfidenceCheck -- "Yes (Repaired)" --> VerifyLive["9. Verify Repaired Selector Live in Browser"]
    
    VerifyLive --> ReExecute{"Re-execution\nSucceeded?"}
    ReExecute -- "Yes" --> UpdateRegistry["10. Update Locator Registry & Log Healing Audit"]
    UpdateRegistry --> NextStep
    ReExecute -- "No" --> LogFail
    
    LogFail --> AbortRun["Abort Test Scenario Execution"]
    AbortRun --> ReportGen["11. Synthesize Reports & Trace Artifacts"]
    LogStepOK --> ReportGen
    
    ReportGen --> HTMLReport["Generate execution_report.html"]
    ReportGen --> AuditReport["Generate self_healing_audit.json"]
    ReportGen --> TraceZip["Export trace.zip Timeline"]
    
    HTMLReport --> End(["🏁 Execution Complete"])
    AuditReport --> End
    TraceZip --> End
```

---

## 2. Detailed Workflow Lifecycle Stages

### Stage 1: Input Ingestion & Environment Setup
1. **Scenario Loading**: The framework CLI receives the path to a scenario file (`--spec scenarios/purchase_flow.md`).
2. **Format Ingestion**: The requirement parser normalizes Markdown, Gherkin, plain text, or JSON into a unified string payload.
3. **Security Masking**: The `MaskUtil` scans for sensitive patterns (passwords, tokens, API keys) and redacts them prior to agent transmission.
4. **Browser Provisioning**: The `BrowserManager` launches a fresh, isolated browser context (Chromium, Firefox, or WebKit) based on CLI arguments.

---

### Stage 2: Intent Planning Phase (Planner Agent)
1. **Prompt Synthesis**: The scenario text is combined with system prompt constraints instructing the LLM to act as a QA Lead.
2. **Atomic Graph Generation**: The Planner Agent decomposes the scenario into discrete, state-aware steps (`ACTION_NAVIGATE`, `ACTION_TYPE`, `ACTION_CLICK`, `ASSERT_TEXT_EQUALS`).
3. **Zod Schema Validation**: The output is validated against `TestPlanSchema`. If structural or field validation fails, the error is fed back to the LLM for immediate correction.

```mermaid
sequenceDiagram
    autonumber
    participant CLI as CLI / Orchestrator
    participant Planner as Planner Agent
    participant LLM as LLM API (OpenAI/Anthropic)
    participant Schema as Zod Schema Validator

    CLI->>Planner: Execute Plan Generation (Scenario Payload)
    Planner->>LLM: Send System Prompt + Requirement Scenario
    LLM-->>Planner: Return Raw JSON Execution Plan
    Planner->>Schema: Validate against TestPlanSchema
    alt Schema Validation Fails
        Schema-->>Planner: Validation Errors Found
        Planner->>LLM: Re-prompt with Error Feedback
        LLM-->>Planner: Return Corrected JSON Plan
    end
    Schema-->>Planner: Validation OK
    Planner-->>CLI: Return Validated TestPlan Graph
```

---

### Stage 3: Live Page Extraction & Action Generation
1. **Page Inspection**: For each atomic step, the `DOMExtractor` extracts the active page's Accessibility Tree using Playwright's `aria-snapshot`.
2. **Registry Lookup**: The orchestrator checks `locator.registry.json` for a previously verified selector matching the target description.
3. **Action Generation**: If not cached, the `GeneratorAgent` evaluates the step intent against the current ARIA snapshot to synthesize a Playwright command (`page.locator('button[name="checkout"]').click()`).
4. **Execution & Auto-Waiting**: The `ActionDispatcher` dispatches the command to Playwright, leveraging built-in auto-waiting for actionability (visible, stable, enabled).

```mermaid
sequenceDiagram
    autonumber
    participant Orchestrator as Execution Orchestrator
    participant Browser as Playwright Browser Page
    participant Extractor as DOM Extractor
    participant Generator as Generator Agent
    participant Dispatcher as Action Dispatcher

    Orchestrator->>Extractor: Capture Page State
    Extractor->>Browser: Request aria-snapshot & visible elements
    Browser-->>Extractor: Return ARIA Tree & Bounding Boxes
    Extractor-->>Orchestrator: Return Compact Snapshot Payload
    Orchestrator->>Generator: Resolve Selector (Step Intent + Snapshot)
    Generator-->>Orchestrator: Return Target Selector & Command
    Orchestrator->>Dispatcher: Dispatch Action (Selector, Intent)
    Dispatcher->>Browser: page.locator(selector).click() / fill()
    Browser-->>Dispatcher: Action Completed Successfully
    Dispatcher-->>Orchestrator: Step Execution PASS
```

---

### Stage 4: Self-Healing Failure Interception & Repair
1. **Failure Hook**: If Playwright throws a runtime exception (`TimeoutError`, `ElementHandleNotFound`, assertion failure), the `FailureInterceptor` halts step execution.
2. **Context Collection**: The interceptor captures a failure screenshot, active DOM snapshot, stack trace, and failed step metadata.
3. **Drift Analysis & Diagnosis**: The `HealerAgent` analyzes structural drift (e.g., changed `id`, changed CSS classes, modified DOM hierarchy).
4. **Candidate Repair**: The Healer Agent generates alternative Playwright selector candidates ranked by confidence score.
5. **Live Verification**: The orchestrator tests replacement candidates against the active browser session. If a candidate is unique and actionable (`isVisible()`), the step is re-executed.
6. **Registry Patching**: Upon successful repair, the new selector is cached in `locator.registry.json` and a self-healing audit entry is logged.

```mermaid
sequenceDiagram
    autonumber
    participant Dispatcher as Action Dispatcher
    participant Browser as Playwright Browser Page
    participant Interceptor as Failure Interceptor
    participant Healer as Healer Agent
    participant Registry as Locator Registry

    Dispatcher->>Browser: page.locator(brokenSelector).click()
    Browser-->>Dispatcher: Exception: TimeoutError (Element not found)
    Dispatcher->>Interceptor: Intercept Runtime Failure
    Interceptor->>Browser: Capture Failure Screenshot & Fresh DOM Snapshot
    Browser-->>Interceptor: Return Context Artifacts
    Interceptor->>Healer: Diagnose Failure (Failed Selector + Stack + Snapshot)
    Healer-->>Interceptor: Return Repaired Selector Candidate (Confidence: 0.96)
    Interceptor->>Browser: Test Repaired Selector (isVisible & count == 1)
    Browser-->>Interceptor: Candidate Verified Unique & Actionable
    Interceptor->>Browser: Re-execute Action with Repaired Selector
    Browser-->>Interceptor: Action PASS
    Interceptor->>Registry: Patch Locator Registry with Repaired Selector
    Interceptor-->>Dispatcher: Step Recovered & Resumed PASS
```

---

### Stage 5: Artifact Packaging & Unified Reporting
1. **Trace Export**: Playwright flushes execution events into `artifacts/<timestamp>/traces/trace.zip`.
2. **Audit Logging**: All self-healing repairs are written to `artifacts/<timestamp>/reports/self_healing_audit.json`.
3. **HTML Dashboard**: An interactive HTML dashboard (`execution_report.html`) is generated, summarizing pass/fail status, step execution duration, agent thought logs, and interactive element diffs.

---

## 3. Agent Lifecycle State Machine

The following state machine governs the state transitions of the framework during test execution.

```mermaid
stateDiagram-v2
    [*] --> UNINITIALIZED
    
    UNINITIALIZED --> INGESTING_REQUIREMENTS: CLI Ingest Command
    INGESTING_REQUIREMENTS --> PLANNING_STEPS: Ingestion & Masking Complete
    
    PLANNING_STEPS --> STEP_EXECUTION_LOOP: TestPlanSchema Validated
    PLANNING_STEPS --> PLANNING_STEPS: Schema Error / LLM Retry
    
    state STEP_EXECUTION_LOOP {
        [*] --> EXTRACTING_PAGE_STATE
        EXTRACTING_PAGE_STATE --> GENERATING_ACTION: State Extracted
        GENERATING_ACTION --> DISPATCHING_ACTION: Action Synthesized
        DISPATCHING_ACTION --> ACTION_PASSED: Playwright Command OK
        DISPATCHING_ACTION --> ACTION_FAILED: Runtime Exception Intercepted
        
        state ACTION_FAILED {
            [*] --> CAPTURING_FAILURE_CONTEXT
            CAPTURING_FAILURE_CONTEXT --> HEALING_IN_PROGRESS: Context Captured
            HEALING_IN_PROGRESS --> VERIFYING_HEALED_SELECTOR: Repair Candidate Generated
            VERIFYING_HEALED_SELECTOR --> RE_EXECUTING_ACTION: Selector Validated
            VERIFYING_HEALED_SELECTOR --> UNRECOVERABLE_DEFECT: Confidence Low / Candidate Invalid
            RE_EXECUTING_ACTION --> ACTION_PASSED: Re-execution OK
            RE_EXECUTING_ACTION --> UNRECOVERABLE_DEFECT: Re-execution Failed
        }
    }
    
    ACTION_PASSED --> STEP_EXECUTION_LOOP: Process Next Step in Plan
    UNRECOVERABLE_DEFECT --> GENERATING_REPORTS: Abort Execution & Log Defect
    STEP_EXECUTION_LOOP --> GENERATING_REPORTS: All Steps Executed Successfully
    
    GENERATING_REPORTS --> COMPLETED: Artifacts & Reports Exported
    COMPLETED --> [*]
```
