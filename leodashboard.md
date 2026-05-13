# Leo Dashboard — System Context & Architecture Reference

> Status: Active production operations dashboard for Leo Packers and Movers  
> Purpose: Shared project context, architecture decisions, module definitions, operational logic, and future roadmap for the Leo Dashboard ecosystem.

---

# 1. Project Overview

Leo Dashboard is an internal operational ERP/dashboard system being built for:

```text
Leo Packers and Movers
```

The goal of the system is to digitize and centralize:

- transportation cost calculations
- warehouse management
- operational accounting
- loans & advances tracking
- fuel monitoring
- client/storage billing
- future logistics and operational workflows

The project started as a transportation calculator and is gradually evolving into a lightweight logistics ERP.

---

# 2. Current Tech Stack

## Frontend

- Next.js (App Router)
- React
- Tailwind CSS
- TypeScript

## Backend / Database

- Supabase
- PostgreSQL

## Storage

- Supabase Storage

## Deployment

- Vercel

---

# 3. Core Architecture Direction

The system is intentionally being built:

```text
Simple first.
Operationally useful first.
Over-engineering avoided.
```

Primary business philosophy:

```text
Track operations clearly.
Surface abnormalities.
Provide visibility.
Avoid unnecessary complexity.
```

The dashboard is intended for:

- admins
- operations managers
- accountants
- warehouse staff
- drivers (limited/mobile flows)

---

# 4. Current Major Modules

## 4.1 Domestic Transportation Calculator

### Purpose

Calculate domestic transportation quotations between cities.

### Current Features

- source city selection
- destination city selection
- household transportation calculation
- vehicle transportation calculation
- packaging cost calculation
- transportation cost calculation
- CFT-based pricing
- distance-based pricing
- dynamic city mapping

### Data Sources

Originally:

```text
Google Sheets + Google Apps Script APIs
```

Current direction:

```text
Migration to Supabase/PostgreSQL
```

### Operational Logic

Transportation pricing varies based on:

- source city
- destination city
- vehicle type
- household goods volume
- vehicle category
- distance
- packaging requirements

### Future Improvements

- quotation generation
- PDF export
- GST calculations
- customer management
- quotation history
- booking conversion

---

## 4.2 International Transportation Calculator

### Purpose

Handle international shipment and relocation calculations.

### Planned/Current Features

- international destination pricing
- shipment mode tracking
- air vs sea cargo calculations
- customs-related costing
- packaging calculations
- quotation generation

### Future Expansion

- container tracking
- customs documentation
- shipment milestone tracking
- international invoice generation

---

## 4.3 Loans & Advances Tracker

### Purpose

Track money given to employees as:

- loans
- advances
- repayments

### Core Features

#### Create Loan/Advance Entry

Supports:

- employee selection
- loan entry
- repayment entry
- advance entry
- date selection
- remarks

### Transaction Types

```text
Loan
Advance
Repayment
```

### Dashboard Features

- total outstanding per employee
- employee transaction history
- active loan visibility
- running balances

### Operational Philosophy

This module behaves like:

```text
Mini ledger/accounting system.
```

Every transaction is stored historically.

Balances are derived from transaction history.

### Future Improvements

- salary deduction support
- PDF statements
- approval workflow
- employee profile pages

---

## 4.4 Warehouse Management System

### Purpose

Manage warehouse clients, storage pods, billing cycles, and ledger transactions.

This is one of the most important operational modules in the system.

---

# 5. Warehouse Management Module

## 5.1 Core Concepts

### Warehouse Client

Client storing goods inside warehouse.

### Warehouse Pod

Logical storage/billing unit assigned to a client.

### Billing Cycle

Defines:

- monthly
- quarterly
- half-yearly
- yearly

billing structures.

### Warehouse Ledger

Tracks:

- charges
- payments
- adjustments
- balances
- GST

---

## 5.2 Current Features

### Client Management

Supports:

- create client
- edit client
- assign billing plans
- assign GST settings
- opening balances

### Pod Management

Supports:

- create warehouse pods
- assign pods to clients
- activate/deactivate pods
- close pods

### Ledger Management

Supports:

- manual ledger entries
- negative entries
- payment tracking
- charge accruals
- GST-aware transactions

### Dashboard Features

- active pods
- closed pods
- outstanding balances
- payment history
- ledger history
- billing visibility

---

## 5.3 Important Architectural Direction

The warehouse system is moving toward:

```text
Application-layer business logic.
```

Meaning:

- business rules handled in Node.js/Next.js backend
- minimal DB triggers
- explicit transaction handling
- ledger as source of truth

---

## 5.4 Future Warehouse Features

Planned:

- warehouse inventory tracking
- pod occupancy visualization
- automated invoices
- WhatsApp/email reminders
- storage analytics
- warehouse profitability
- warehouse documents/uploads

---

# 6. Fuel Tracking & Mileage Monitoring Module

## 6.1 Purpose

Track:

- diesel expenses
- fuel consumption
- approximate mileage
- operational fuel trends

for company vehicles.

The purpose is:

```text
Operational visibility.
Not strict driver policing.
```

---

## 6.2 Operational Philosophy

The system intentionally uses:

```text
Approximate operational calculations.
```

Real-world fuel refills are inconsistent.

The company primarily wants:

- trends
- averages
- abnormalities
- cost visibility

not scientific fuel telemetry.

---

## 6.3 Fuel Tracking Features

### Vehicle Master

Tracks:

- vehicle number
- vehicle type
- assigned driver
- starting odometer
- vehicle status

### Fuel Entry Module

Supports:

- fuel amount entry
- fuel liters entry
- odometer reading
- fuel date
- bill image upload
- optional meter image upload
- remarks

### Mileage Logic

Mileage is approximated using:

```text
(Current Odometer - Previous Odometer)
/
Current Fuel Liters
```

Additional calculations:

- total fuel spend
- total liters consumed
- average mileage
- fuel cost per KM

---

## 6.4 Dashboard Features

Vehicle-wise dashboard showing:

- total KM travelled
- total fuel expense
- total liters consumed
- average mileage
- cost per KM
- recent fuel entries
- monthly trends

### Abnormality Indicators

Soft indicators only:

- unusual mileage drops
- abnormal fuel costs
- incorrect odometer entries

Purpose:

```text
Highlight possible operational issues.
```

Not:

```text
Strict auditing.
```

---

## 6.5 Fuel Module Future Scope

Possible future additions:

- OCR bill reading
- service history
- tire tracking
- maintenance logs
- FASTag expense tracking
- trip tracking
- GPS integration
- vehicle profitability analytics

---

# 7. Shared System Design Principles

## 7.1 Historical Data First

Operational history should remain preserved.

Example:

```text
Fuel entries are historical records.
Ledger entries are historical records.
Loan transactions are historical records.
```

Derived values:

```text
balances
averages
outstanding values
```

should be calculated from history.

---

## 7.2 Dashboard Philosophy

The system is intended to provide:

```text
Operational visibility.
```

Meaning:

- trends
- summaries
- abnormalities
- historical tracking
- decision support

rather than extremely rigid ERP workflows.

---

## 7.3 Mobile-Friendly Operational Flows

Many flows are expected to be used from:

- mobile phones
- warehouse floor devices
- driver phones

Forms should therefore remain:

- simple
- fast
- operationally practical

---

## 7.4 Expandable ERP Direction

The project is gradually evolving toward:

```text
Logistics + Warehouse + Operations ERP
```

without becoming overly enterprise-heavy.

---

# 8. Current Folder/Architecture Direction

## Frontend Philosophy

- component-based architecture
- reusable cards/forms/tables
- dashboard-first UI
- minimal route complexity where possible
- local-state view switching for some modules

---

## Backend Philosophy

Preferred direction:

```text
Structured API layer.
```

Meaning:

- frontend should not directly own business rules
- database should not contain excessive operational logic
- API routes should own calculations and validation

---

# 9. Future Planned Modules

Potential future modules:

- driver management
- trip sheets
- shipment tracking
- quotation system
- invoice generation
- maintenance tracker
- customer CRM
- document management
- notifications/reminders
- analytics dashboard
- operational profitability tracking

---

# 10. Long-Term Vision

The long-term goal is:

```text
A unified operational dashboard for Leo Packers and Movers.
```

The system should eventually provide visibility into:

- transportation operations
- warehouse operations
- fuel expenses
- operational accounting
- client billing
- employee financial tracking
- logistics analytics

while remaining:

```text
simple
fast
operationally practical
maintainable
```

---

# 11. Important Development Philosophy

The project intentionally prioritizes:

```text
Working operational systems
over
premature architectural perfection.
```

The intended evolution path is:

```text
Simple operational MVP
  ↓
Operational adoption
  ↓
Incremental refinement
  ↓
Deeper analytics and automation
```

rather than:

```text
Massive over-engineered ERP from day one.
```

---

# 12. Current Operational Summary

Current active system areas:

```text
Domestic Transportation Calculator
International Calculator
Loans & Advances Tracker
Warehouse Management System
Fuel Tracking System (planned)
```

This file should be treated as:

- shared project context
- onboarding reference
- architecture reference
- future planning document
- AI context reference
- operational understanding document

Whenever major architectural or operational decisions evolve, this file should be updated.
