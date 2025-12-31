# Bible Memory App - State Architecture Diagram

## Overview
The Bible Memory application uses a custom stack-based state management system built with jQuery.

---

## State Architecture

```mermaid
graph TB
    subgraph Global State
        AllVerses[("allVerses<br/>(from Laravel backend)<br/>All user verses")]
        Verses[("verses[]<br/>(filtered selection)<br/>Current review set")]
        ContextStack[("context<br/>(ContextStack instance)<br/>Navigation stack")]
    end

    subgraph ContextStack Structure
        Stack["stack[]<br/>(Array of Context objects)"]
        Current["current<br/>(Reference to top Context)"]
        Stack --> Current
    end

    subgraph Context Object
        Mode["mode (string)<br/>required"]
        Props["Additional Properties:<br/>• n (verse counter)<br/>• submode<br/>• hints<br/>• level"]
        Mode -.-> Props
    end

    AllVerses -->|selectRandomVerses<br/>selectAllVerses| Verses
    ContextStack --> Stack
```

---

## Application Modes (State Machine)

```mermaid
stateDiagram-v2
    [*] --> loading
    loading --> mainmenu: Document Ready

    mainmenu --> verselist: Show Verse List
    mainmenu --> review: Start Review

    verselist --> review: Click Verse
    verselist --> mainmenu: Back Button

    review --> flashcards: Show Flash Cards
    review --> remindermeditate: Meditate Questions
    review --> reminderapply: Apply Questions
    review --> verselist: Back Button
    review --> mainmenu: Cancel Review

    flashcards --> review: Back Button
    remindermeditate --> review: Back Button
    reminderapply --> review: Back Button

    note right of review
        Has submodes:
        • reference (default)
        • content (revealed)
        • hints (partial reveal)
        • firstletters (initials)
    end note

    note right of flashcards
        Has level property:
        • 0 = Show Verse
        • 10 = Beginner
        • 25 = Intermediate
        • 45 = Advanced
        • 100 = Memorized
    end note
```

---

## Context State Properties by Mode

```mermaid
graph LR
    subgraph loading
        L1[mode: 'loading']
    end

    subgraph mainmenu
        M1[mode: 'mainmenu']
    end

    subgraph verselist
        VL1[mode: 'verselist']
    end

    subgraph review
        R1[mode: 'review']
        R2[n: verse number 1-indexed]
        R3[submode: 'reference' | 'content' | 'hints' | 'firstletters']
        R4[hints: number optional]
        R1 --> R2
        R1 --> R3
        R1 --> R4
    end

    subgraph flashcards
        F1[mode: 'flashcards']
        F2[n: verse number]
        F3[level: 0-100]
        F1 --> F2
        F1 --> F3
    end

    subgraph remindermeditate
        RM1[mode: 'remindermeditate']
    end

    subgraph reminderapply
        RA1[mode: 'reminderapply']
    end
```

---

## Data Flow Architecture

```mermaid
flowchart TD
    Backend["Laravel Backend<br/>(Blade Template)"]
    AllVerses["allVerses<br/>(Global Variable)"]

    Backend -->|json_encode| AllVerses

    AllVerses -->|selectRandomVerses| FilterLogic{Filter by<br/>review_cat}
    AllVerses -->|selectAllVerses| DirectCopy[Array Clone]

    FilterLogic -->|review_cat: 'l' or 'd'| Include1[Include Always]
    FilterLogic -->|review_cat: 'w'| Include2[Include 1/7 random]
    FilterLogic -->|review_cat: 'm'| Include3[Include 1/30 random]
    FilterLogic -->|review_cat: 'auto'| AutoCalc[Calculate from<br/>started_at date]

    Include1 --> Verses
    Include2 --> Verses
    Include3 --> Verses
    AutoCalc --> Verses
    DirectCopy --> Verses

    Verses["verses[]<br/>(Active Review Set)"]

    Verses -->|Display| UI[User Interface]

    subgraph Persistence
        LocalStorage[("localStorage<br/>• verses<br/>• context")]
        Verses -.->|Save 's' key| LocalStorage
        ContextStack["context<br/>(ContextStack)"] -.->|Save 's' key| LocalStorage
        LocalStorage -.->|Load 'l' key| Verses
        LocalStorage -.->|Load 'l' key| ContextStack
    end
```

---

## Review Submodes Flow

```mermaid
flowchart LR
    Reference["submode: 'reference'<br/>(Shows only verse reference)"]
    Content["submode: 'content'<br/>(Shows full text)"]
    Hints["submode: 'hints'<br/>(Shows N words)"]
    FirstLetters["submode: 'firstletters'<br/>(Shows initials)"]

    Reference -->|Space/Click<br/>advance| Content
    Content -->|Space/Click<br/>next verse| Reference
    Reference -->|'h' key<br/>add_hint| Hints
    Reference -->|'f' key<br/>showFirstLetters| FirstLetters

    Hints -->|Increment hints| Hints
    FirstLetters -.->|Navigate| Reference
    Hints -.->|Navigate| Reference
```

---

## Verse Object Schema

```mermaid
classDiagram
    class Verse {
        +int id
        +int user_id
        +string reference
        +string content
        +string tags
        +date started_at
        +string review_cat
    }

    class ReviewCategories {
        'f' : future
        'l' : learn (daily < 8 days)
        'd' : daily (8-56 days)
        'w' : weekly (56-112 days)
        'm' : monthly (>112 days)
        'auto' : calculated from started_at
    }

    Verse --> ReviewCategories
```

---

## ContextStack Operations

```mermaid
sequenceDiagram
    participant UI
    participant ContextStack
    participant Stack as stack[]
    participant Current

    Note over UI,Current: Initialization
    UI->>ContextStack: new ContextStack()
    ContextStack->>Stack: stack = []
    ContextStack->>ContextStack: updateCurrent()
    ContextStack->>Stack: push(new Context('mainmenu'))
    Stack->>Current: current = stack[0]

    Note over UI,Current: Navigation Forward
    UI->>ContextStack: pushMode('review')
    ContextStack->>Stack: push(new Context('review'))
    Stack->>Current: current = stack[stack.length-1]

    Note over UI,Current: Navigation Back
    UI->>ContextStack: pop()
    ContextStack->>Stack: stack.pop()
    Stack->>Current: current = stack[stack.length-1]

    Note over UI,Current: State Update
    UI->>ContextStack: set(newContext)
    ContextStack->>Stack: stack[stack.length-1] = newContext
    Stack->>Current: current = stack[stack.length-1]
```

---

## Keyboard Shortcuts & State Changes

| Key | Action | Context Mode | State Change |
|-----|--------|--------------|--------------|
| `n` | Next verse | review | `context.current.n++`, `submode = 'reference'` |
| `Space` | Advance/Reveal | review | `submode = 'content'` or next verse |
| `p` | Previous verse | review | `context.current.n--`, `submode = 'reference'` |
| `h` | Show hints | review | `submode = 'hints'`, `hints += 1` |
| `f` | First letters | review | `submode = 'firstletters'` |
| `s` | Save locally | any | `localStorage.verses/context = ...` |
| `l` | Load locally | any | `verses/context = localStorage...` |

---

## State Persistence Strategy

```mermaid
flowchart TB
    subgraph Browser
        Memory["In-Memory State<br/>• verses[]<br/>• context (ContextStack)"]
        LocalStorage["localStorage<br/>• verses (JSON)<br/>• context (JSON)"]
    end

    subgraph Server
        Database[(Laravel Database<br/>verses table)]
    end

    Database -->|Page Load<br/>Blade Template| Memory
    Memory -->|'s' key<br/>dataLocalSave| LocalStorage
    LocalStorage -->|'l' key<br/>dataLocalLoad| Memory

    Memory -.->|Future: AJAX<br/>Not implemented| Database
```

---

## Auto Review Frequency Calculation

```mermaid
flowchart TD
    Start[started_at date] --> CalcDays[Calculate days<br/>since started]
    CalcDays --> Check1{days < 0?}
    Check1 -->|Yes| Future['f' = future]
    Check1 -->|No| Check2{days < 8?}
    Check2 -->|Yes| Learn['l' = learn<br/>show daily]
    Check2 -->|No| Check3{days < 56?}
    Check3 -->|Yes| Daily['d' = daily<br/>show daily]
    Check3 -->|No| Check4{days < 112?}
    Check4 -->|Yes| Weekly['w' = weekly<br/>1/7 probability]
    Check4 -->|No| Monthly['m' = monthly<br/>1/30 probability]

    Learn --> Filter[selectRandomVerses<br/>filtering]
    Daily --> Filter
    Weekly --> Filter
    Monthly --> Filter
    Future --> Filter
```

---

## Component Rendering Flow

```mermaid
sequenceDiagram
    participant Event
    participant Handler
    participant Context
    participant refreshPage
    participant DOM

    Event->>Handler: User Action<br/>(click, keypress, etc.)
    Handler->>Context: Update context state<br/>(push/pop/set mode,<br/>update properties)
    Handler->>refreshPage: refreshPage()

    refreshPage->>Context: Read context.current.mode

    alt mode == 'review'
        refreshPage->>DOM: $('#master').append($('#tReview').clone())
        refreshPage->>Context: Read context.current.n
        refreshPage->>DOM: Update verse content<br/>based on submode
    else mode == 'flashcards'
        refreshPage->>DOM: $('#master').append($('#tFlashCards').clone())
        refreshPage->>refreshPage: generateFlashCardContent()
    else mode == 'verselist'
        refreshPage->>DOM: $('#master').append($('#tVerseList').clone())
        refreshPage->>DOM: Render verse list<br/>with click handlers
    else Other modes
        refreshPage->>DOM: Render appropriate template
    end

    refreshPage->>DOM: $.scrollTo($('h1'))
```

---

## Summary

### Key State Management Principles

1. **Stack-Based Navigation**: The app uses a `ContextStack` with push/pop operations for modal-like navigation
2. **Mode-Driven UI**: Each Context has a `mode` that determines which template/screen to render
3. **Immutable Context Updates**: Each state change creates or replaces Context objects rather than mutating
4. **Local Persistence**: State can be saved/loaded from localStorage for offline functionality
5. **Server Initialization**: Initial verse data comes from Laravel backend via Blade template

### State Flow Pattern

```
User Action → Update Context → refreshPage() → Read Context → Render DOM
```

### Technologies

- **State Management**: Custom JavaScript classes (Context, ContextStack)
- **Persistence**: Browser localStorage + Laravel backend
- **Rendering**: jQuery DOM manipulation with template cloning
- **Navigation**: Stack-based with push/pop operations
